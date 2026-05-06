import {
    calculateFrameMetrics,
    calculatePreviewScale,
} from '../../js/renderer.js';
import { renderTemplateFrame } from '../../js/core/render/runtime.js';
import type { PhotoEntry } from '../types/photo';
import type { FrameTemplate } from '../types/template';

export async function renderPreviewCanvas({
    canvas,
    photo,
    template,
    fieldValues,
    exifOverrides,
    container,
}: {
    canvas: HTMLCanvasElement;
    photo: PhotoEntry;
    template: FrameTemplate;
    fieldValues: Record<string, unknown>;
    exifOverrides: Record<string, string>;
    container: HTMLElement;
}) {
    const scale = calculatePreviewScale(
        photo.image,
        template,
        container.clientWidth,
        container.clientHeight,
        0.9,
        fieldValues
    );

    return renderTemplateFrame(canvas, photo.image, template, fieldValues, {
        scale,
        photo,
        exifOverrides,
        mode: 'preview',
    });
}

export function getBaseFrameDimensions(
    photo: PhotoEntry,
    template: FrameTemplate,
    fieldValues: Record<string, unknown>
) {
    const metrics = calculateFrameMetrics(photo.image, template, 1, fieldValues);

    return {
        width: metrics.fullWidth,
        height: metrics.fullHeight,
    };
}
