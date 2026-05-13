import { renderTextModel } from '../text/index.ts';
import { resolveTemplateAppearance, resolveTemplateConfig } from '../templates/registry.ts';
import { buildTemplateResolveInput, createGlobalRenderSettings } from './input.ts';
import { copyCanvasInto, setupCanvas } from './canvas.ts';
import { calculateFrameMetrics } from './metrics.ts';
import { renderDeclarativeOverlays } from './overlays.ts';
import { applyGlobalPostProcessing } from './post-processing.ts';
import { drawSurfaceBackground } from './surface.ts';
import { createRuntimeHelpers } from './text-runtime.ts';

export async function renderTemplateFrame(canvas: HTMLCanvasElement, image: HTMLImageElement, template: any, rawConfig: Record<string, unknown>, options: Record<string, any> = {}) {
    const scale = options.scale ?? 1;
    const config = resolveTemplateConfig(template, rawConfig);
    const globalSettings = createGlobalRenderSettings({
        ...(options.global ?? {}),
        scale,
        mode: options.mode ?? options.global?.mode ?? 'preview',
    });
    const layoutMetrics = calculateFrameMetrics(image, template, scale, config);
    const displayWidth = Math.round(layoutMetrics.fullWidth * scale);
    const displayHeight = Math.round(layoutMetrics.fullHeight * scale);
    const canvasSetup = setupCanvas(canvas, displayWidth, displayHeight, scale);

    if (!canvasSetup) {
        return null;
    }

    const { ctx } = canvasSetup;

    const resolveInput = buildTemplateResolveInput({
        photo: options.photo ?? {
            file: null,
            image,
            width: image?.naturalWidth ?? 0,
            height: image?.naturalHeight ?? 0,
            name: null,
            type: null,
            size: null,
        },
        customText: config,
        exifOverrides: options.exifOverrides ?? {},
        global: globalSettings,
    });
    const data = template.resolveData(resolveInput);
    const appearance = resolveTemplateAppearance(template, config);
    const canvasBackground = appearance.canvasBackground ?? {
        type: 'solid',
        color: (appearance as Record<string, any>).backgroundColor ?? data?.backgroundColor ?? template.backgroundColor,
    };

    drawSurfaceBackground(ctx, image, {
        x: 0,
        y: 0,
        width: displayWidth,
        height: displayHeight,
    }, canvasBackground, {
        photoArea: layoutMetrics.scaledPhotoArea,
    });
    ctx.drawImage(
        image,
        layoutMetrics.scaledPhotoArea.x,
        layoutMetrics.scaledPhotoArea.y,
        layoutMetrics.scaledPhotoArea.width,
        layoutMetrics.scaledPhotoArea.height
    );

    const canvasSize = {
        width: displayWidth,
        height: displayHeight,
    };

    const runtime = createRuntimeHelpers({
        canvas,
        ctx,
        canvasSize,
    });

    const renderArgs = {
        template,
        textModel: options.textModel,
        photo: resolveInput.photo,
        config,
        data,
        appearance,
        resolveInput,
        metrics: layoutMetrics,
        canvasSize,
        runtime,
    };

    await renderTextModel(ctx, renderArgs);

    renderDeclarativeOverlays(ctx, renderArgs);

    if (!template.overlays?.length && typeof template.renderOverlay === 'function') {
        template.renderOverlay(ctx, renderArgs);
    }

    const processedCanvas = applyGlobalPostProcessing(canvas, globalSettings);
    if (processedCanvas !== canvas) {
        copyCanvasInto(processedCanvas, canvas);
    }

    return {
        canvas,
        processedCanvas: processedCanvas === canvas ? canvas : processedCanvas,
        config,
        data,
        appearance,
        global: globalSettings,
        resolveInput,
        metrics: layoutMetrics,
        canvasSize,
        runtime,
    };
}
