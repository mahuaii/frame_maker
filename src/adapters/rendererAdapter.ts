import {
    calculateFrameMetrics,
    calculatePreviewScale,
} from '../../js/renderer.js';
import { renderTemplateFrame } from '../../js/core/render/runtime.js';
import type { PhotoEntry } from '../types/photo';
import type { FrameTemplate } from '../types/template';
import type { TextModel } from '../types/text';

export async function renderPreviewCanvas({
    canvas,
    photo,
    template,
    fieldValues,
    exifOverrides,
    textModel,
    container,
}: {
    canvas: HTMLCanvasElement;
    photo: PhotoEntry;
    template: FrameTemplate;
    fieldValues: Record<string, unknown>;
    exifOverrides: Record<string, string>;
    textModel?: TextModel;
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
        textModel,
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
