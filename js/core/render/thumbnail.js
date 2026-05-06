const DEFAULT_THUMBNAIL_SIZE = 96;
const DEFAULT_THUMBNAIL_QUALITY = 0.82;
const DEFAULT_THUMBNAIL_BACKGROUND = '#f5f5f5';

function getImageDimensions(image) {
    return {
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
    };
}

function resolveThumbnailCrop(width, height) {
    const cropSize = Math.min(width, height);

    return {
        sx: Math.max((width - cropSize) / 2, 0),
        sy: Math.max((height - cropSize) / 2, 0),
        sw: cropSize,
        sh: cropSize,
    };
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
                return;
            }

            reject(new Error('thumbnail-blob-failed'));
        }, mimeType, quality);
    });
}

export function resolveThumbnailBackgroundColor(
    variableNames = ['--color-bg-elevated', '--color-bg-preview'],
    fallback = DEFAULT_THUMBNAIL_BACKGROUND
) {
    if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
        return fallback;
    }

    const styles = window.getComputedStyle(document.documentElement);
    const names = Array.isArray(variableNames) ? variableNames : [variableNames];

    for (const variableName of names) {
        const color = styles.getPropertyValue(variableName).trim();
        if (color) {
            return color;
        }
    }

    return fallback;
}

export async function createImageThumbnailObjectUrl(image, options = {}) {
    const {
        size = DEFAULT_THUMBNAIL_SIZE,
        mimeType = 'image/jpeg',
        quality = DEFAULT_THUMBNAIL_QUALITY,
        backgroundColor = resolveThumbnailBackgroundColor(),
    } = options;
    const { width, height } = getImageDimensions(image);

    if (!width || !height) {
        throw new Error('thumbnail-image-size-missing');
    }

    const canvas = document.createElement('canvas');
    const outputSize = Math.max(Math.round(size), 1);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('thumbnail-context-missing');
    }

    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputSize, outputSize);

    const crop = resolveThumbnailCrop(width, height);
    ctx.drawImage(
        image,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        outputSize,
        outputSize
    );

    const blob = await canvasToBlob(canvas, mimeType, quality);
    return URL.createObjectURL(blob);
}
