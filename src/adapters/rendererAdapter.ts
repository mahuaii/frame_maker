import {
    calculateFrameMetrics,
    calculatePreviewScale,
} from '../../js/renderer.ts';
import { renderTemplateFrame } from '../../js/core/render/runtime.ts';
import type { PhotoEntry } from '../types/photo';
import type {
    CalculateFrameMetrics,
    CalculatePreviewScale,
    RenderTemplateFrame,
} from '../types/render';
import type { FrameTemplate } from '../types/template';
import type { TextModel } from '../types/text';

const calculateFrameMetricsContract = calculateFrameMetrics as unknown as CalculateFrameMetrics;
const calculatePreviewScaleContract = calculatePreviewScale as unknown as CalculatePreviewScale;
const renderTemplateFrameContract = renderTemplateFrame as unknown as RenderTemplateFrame;

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
    const scale = calculatePreviewScaleContract(
        photo.image,
        template,
        container.clientWidth,
        container.clientHeight,
        0.9,
        fieldValues
    );

    return renderTemplateFrameContract(canvas, photo.image, template, fieldValues, {
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
    const metrics = calculateFrameMetricsContract(photo.image, template, 1, fieldValues);

    return {
        width: metrics.fullWidth,
        height: metrics.fullHeight,
    };
}
