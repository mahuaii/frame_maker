import { renderTemplateFrame } from '../../js/core/render/runtime.js';
import { resolveResizeDimensions } from '../../js/core/render/sizing.js';
import { getBaseFrameDimensions } from './rendererAdapter';
import type { ExportSettings } from '../types/editor';
import type { PhotoEntry } from '../types/photo';
import type { FrameTemplate } from '../types/template';
import type { TextModel } from '../types/text';

function getExtensionForMimeType(mimeType: string) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
}

export function buildExportFilename(photoName: string | null, mimeType: string) {
    const extension = getExtensionForMimeType(mimeType);
    const baseName = photoName
        ? photoName.replace(/\.[^.]+$/, '')
        : 'frame_maker_export';

    return `${baseName}_framed.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('导出图片失败'));
                return;
            }

            resolve(blob);
        }, mimeType, quality);
    });
}

export async function exportCurrentPhoto({
    photo,
    template,
    fieldValues,
    exifOverrides,
    textModel,
    settings,
}: {
    photo: PhotoEntry;
    template: FrameTemplate;
    fieldValues: Record<string, unknown>;
    exifOverrides: Record<string, string>;
    textModel?: TextModel;
    settings: ExportSettings;
}) {
    const baseDimensions = getBaseFrameDimensions(photo, template, fieldValues);
    const resize = resolveResizeDimensions({
        sizePreset: settings.sizePreset,
        customWidth: settings.customWidth,
        customHeight: settings.customHeight,
        baseDimensions,
    });
    const canvas = document.createElement('canvas');

    await renderTemplateFrame(canvas, photo.image, template, fieldValues, {
        scale: 1,
        photo,
        exifOverrides,
        textModel,
        mode: 'export',
        global: {
            resize,
            compression: {
                mimeType: settings.format,
                quality: settings.jpegQuality,
            },
        },
    });

    const blob = await canvasToBlob(canvas, settings.format, settings.jpegQuality);

    return {
        blob,
        filename: buildExportFilename(photo.name, settings.format),
    };
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
