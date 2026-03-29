const EXIF_CACHE = new WeakMap();

const TIFF_TYPE_SIZES = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    7: 1,
    9: 4,
    10: 8,
};

const EXIF_TAGS = {
    0x010f: 'make',
    0x0110: 'model',
    0x0132: 'modifiedAt',
    0x8769: 'exifIFDPointer',
    0x9003: 'dateTimeOriginal',
    0x829d: 'fNumber',
    0x829a: 'exposureTime',
    0x8827: 'iso',
    0x920a: 'focalLength',
    0xa405: 'focalLengthIn35mm',
    0xa434: 'lensModel',
};

export function createPhotoSource({ file = null, image }) {
    return {
        file,
        image,
        width: image?.naturalWidth ?? image?.width ?? 0,
        height: image?.naturalHeight ?? image?.height ?? 0,
        name: file?.name ?? null,
        type: file?.type ?? null,
        size: file?.size ?? null,
    };
}

function canReadExifFromPhoto(photo) {
    return Boolean(photo?.file && typeof photo.file.arrayBuffer === 'function');
}

function readAscii(view, offset, count) {
    const end = Math.min(offset + count, view.byteLength);
    let value = '';

    for (let index = offset; index < end; index += 1) {
        const byte = view.getUint8(index);
        if (byte === 0) break;
        value += String.fromCharCode(byte);
    }

    return value.trim();
}

function readRational(view, offset, littleEndian, signed = false) {
    if (offset + 8 > view.byteLength) {
        return null;
    }

    const numerator = signed
        ? view.getInt32(offset, littleEndian)
        : view.getUint32(offset, littleEndian);
    const denominator = signed
        ? view.getInt32(offset + 4, littleEndian)
        : view.getUint32(offset + 4, littleEndian);

    if (!denominator) {
        return null;
    }

    return numerator / denominator;
}

function readInlineNumber(view, type, valueOffset, littleEndian) {
    switch (type) {
        case 1:
        case 7:
            return view.getUint8(valueOffset);
        case 3:
            return view.getUint16(valueOffset, littleEndian);
        case 4:
            return view.getUint32(valueOffset, littleEndian);
        case 9:
            return view.getInt32(valueOffset, littleEndian);
        default:
            return null;
    }
}

function readTiffValue(view, tiffOffset, entryOffset, type, count, littleEndian) {
    const valueOffsetField = entryOffset + 8;
    const unitSize = TIFF_TYPE_SIZES[type];

    if (!unitSize) {
        return null;
    }

    const totalSize = unitSize * count;
    const dataOffset = totalSize <= 4
        ? valueOffsetField
        : tiffOffset + view.getUint32(valueOffsetField, littleEndian);

    if (dataOffset < 0 || dataOffset >= view.byteLength) {
        return null;
    }

    switch (type) {
        case 2:
            return readAscii(view, dataOffset, count);
        case 3:
        case 4:
        case 9:
            if (count === 1) {
                return readInlineNumber(view, type, dataOffset, littleEndian);
            }
            return null;
        case 5:
            if (count === 1) {
                return readRational(view, dataOffset, littleEndian, false);
            }
            return null;
        case 10:
            if (count === 1) {
                return readRational(view, dataOffset, littleEndian, true);
            }
            return null;
        default:
            return null;
    }
}

function readIfdEntries(view, tiffOffset, ifdOffset, littleEndian, output) {
    const absoluteOffset = tiffOffset + ifdOffset;
    if (absoluteOffset + 2 > view.byteLength) {
        return;
    }

    const entryCount = view.getUint16(absoluteOffset, littleEndian);

    for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = absoluteOffset + 2 + index * 12;
        if (entryOffset + 12 > view.byteLength) {
            break;
        }

        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        const key = EXIF_TAGS[tag];
        const value = readTiffValue(view, tiffOffset, entryOffset, type, count, littleEndian);

        if (key === 'exifIFDPointer' && typeof value === 'number') {
            readIfdEntries(view, tiffOffset, value, littleEndian, output);
            continue;
        }

        if (key && value !== null && value !== undefined && value !== '') {
            output[key] = value;
        }
    }
}

function parseExifFromJpegBuffer(buffer) {
    const view = new DataView(buffer);

    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
        return null;
    }

    let offset = 2;

    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xffda || marker === 0xffd9) {
            break;
        }

        const segmentLength = view.getUint16(offset, false);
        if (segmentLength < 2 || offset + segmentLength > view.byteLength) {
            break;
        }

        if (marker === 0xffe1 && segmentLength >= 10) {
            const exifHeader = readAscii(view, offset + 2, 6);
            if (exifHeader === 'Exif') {
                const tiffOffset = offset + 2 + 6;
                if (tiffOffset + 8 > view.byteLength) {
                    return null;
                }

                const byteOrder = view.getUint16(tiffOffset, false);
                const littleEndian = byteOrder === 0x4949;
                if (!littleEndian && byteOrder !== 0x4d4d) {
                    return null;
                }

                const signature = view.getUint16(tiffOffset + 2, littleEndian);
                if (signature !== 42) {
                    return null;
                }

                const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
                const exif = {};
                readIfdEntries(view, tiffOffset, firstIfdOffset, littleEndian, exif);
                return exif;
            }
        }

        offset += segmentLength;
    }

    return null;
}

function formatExposureTime(exposureTime) {
    if (typeof exposureTime !== 'number' || exposureTime <= 0) {
        return null;
    }

    if (exposureTime >= 1) {
        return `${Number(exposureTime.toFixed(1))}s`;
    }

    return `1/${Math.round(1 / exposureTime)}`;
}

function formatFNumber(fNumber) {
    if (typeof fNumber !== 'number' || fNumber <= 0) {
        return null;
    }

    return `f/${Number(fNumber.toFixed(1))}`;
}

function formatFocalLength(focalLength) {
    if (typeof focalLength !== 'number' || focalLength <= 0) {
        return null;
    }

    return `${Number(focalLength.toFixed(0))}mm`;
}

function normalizeExifData(rawExif) {
    if (!rawExif) {
        return null;
    }

    return {
        make: rawExif.make ?? null,
        model: rawExif.model ?? null,
        lensModel: rawExif.lensModel ?? null,
        dateTimeOriginal: rawExif.dateTimeOriginal ?? null,
        modifiedAt: rawExif.modifiedAt ?? null,
        fNumber: typeof rawExif.fNumber === 'number' ? rawExif.fNumber : null,
        exposureTime: typeof rawExif.exposureTime === 'number' ? rawExif.exposureTime : null,
        iso: typeof rawExif.iso === 'number' ? rawExif.iso : null,
        focalLength: typeof rawExif.focalLength === 'number' ? rawExif.focalLength : null,
        focalLengthIn35mm: typeof rawExif.focalLengthIn35mm === 'number' ? rawExif.focalLengthIn35mm : null,
        formatted: {
            camera: [rawExif.make, rawExif.model].filter(Boolean).join(' ').trim() || null,
            lens: rawExif.lensModel ?? null,
            aperture: formatFNumber(rawExif.fNumber),
            shutter: formatExposureTime(rawExif.exposureTime),
            iso: rawExif.iso ? String(rawExif.iso) : null,
            focalLength: formatFocalLength(rawExif.focalLength),
            focalLengthIn35mm: formatFocalLength(rawExif.focalLengthIn35mm),
        },
    };
}

export async function extractExifData(photo) {
    if (!canReadExifFromPhoto(photo)) {
        return null;
    }

    if (EXIF_CACHE.has(photo.file)) {
        return EXIF_CACHE.get(photo.file);
    }

    try {
        const buffer = await photo.file.arrayBuffer();
        const exif = normalizeExifData(parseExifFromJpegBuffer(buffer));
        EXIF_CACHE.set(photo.file, exif);
        return exif;
    } catch (error) {
        console.warn('Failed to extract EXIF data from photo.', error);
        EXIF_CACHE.set(photo.file, null);
        return null;
    }
}

export function createGlobalRenderSettings({
    scale = 1,
    mode = 'preview',
    watermark = null,
    resize = null,
    compression = null,
} = {}) {
    const normalizedResize = resize && typeof resize === 'object'
        ? {
            width: Number.isFinite(Number(resize.width)) ? Number(resize.width) : null,
            height: Number.isFinite(Number(resize.height)) ? Number(resize.height) : null,
        }
        : null;
    const normalizedCompression = compression && typeof compression === 'object'
        ? {
            mimeType: compression.mimeType ?? 'image/png',
            quality: Number.isFinite(Number(compression.quality))
                ? Number(compression.quality)
                : 0.92,
        }
        : {
            mimeType: 'image/png',
            quality: 0.92,
        };

    return {
        scale,
        mode,
        watermark,
        resize: normalizedResize,
        compression: normalizedCompression,
    };
}

export async function buildTemplateResolveInput({
    photo,
    customText = {},
    global = {},
}) {
    return {
        photo,
        exif: await extractExifData(photo),
        customText,
        global,
    };
}
