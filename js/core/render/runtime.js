import { loadRuntimeFonts, ensureRuntimeFont } from '../fonts/index.js';
import { buildTemplateResolveInput, createGlobalRenderSettings } from './input.js';
import { resolveTemplateConfig } from '../templates/registry.js';

function getBasisSize(imageWidth, imageHeight, basis) {
    switch (basis) {
        case 'width':
            return imageWidth;
        case 'height':
            return imageHeight;
        case 'shorterSide':
            return Math.min(imageWidth, imageHeight);
        case 'longerSide':
            return Math.max(imageWidth, imageHeight);
        case 'area':
            return Math.sqrt(imageWidth * imageHeight);
        default:
            return imageHeight;
    }
}

export function calculateFrameMetrics(image, template, scale = 1) {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const barBasisSize = getBasisSize(imageWidth, imageHeight, template.barSizeBasis);
    const fontBasisSize = getBasisSize(imageWidth, imageHeight, template.fontSizeBasis);
    const barHeight = Math.round(barBasisSize * template.barHeightRatio);
    const rawFontSize = Math.round(fontBasisSize * template.fontSizeRatio);
    const fontSize = Math.max(template.minFontSize ?? 12, rawFontSize);

    return {
        imageWidth,
        imageHeight,
        fullWidth: imageWidth,
        fullHeight: imageHeight + barHeight,
        barBasisSize,
        fontBasisSize,
        barHeight,
        fontSize,
        textRunBaseFontSize: fontSize,
        scaledImageWidth: imageWidth * scale,
        scaledImageHeight: imageHeight * scale,
        scaledBarHeight: barHeight * scale,
        scaledFontSize: fontSize * scale,
        scaledTextRunBaseFontSize: fontSize * scale,
    };
}

export function calculatePreviewScale(image, template, containerWidth, containerHeight, padding = 0.9) {
    const { fullWidth, fullHeight } = calculateFrameMetrics(image, template, 1);

    const maxWidth = containerWidth * padding;
    const maxHeight = containerHeight * padding;

    const scaleX = maxWidth / fullWidth;
    const scaleY = maxHeight / fullHeight;

    return Math.min(scaleX, scaleY, 1);
}

export function setupCanvas(canvas, displayWidth, displayHeight, scale = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = scale < 1 ? (window.devicePixelRatio || 1) : 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    return {
        ctx,
        dpr,
    };
}

export function drawBasePhoto(ctx, image, { displayWidth, displayHeight, layoutMetrics, backgroundColor }) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(image, 0, 0, layoutMetrics.scaledImageWidth, layoutMetrics.scaledImageHeight);
}

export function scaleByShortEdge(canvasSize, ratio) {
    return Math.min(canvasSize.width, canvasSize.height) * ratio;
}

export function scaleByLongEdge(canvasSize, ratio) {
    return Math.max(canvasSize.width, canvasSize.height) * ratio;
}

export function measureText(ctx, {
    text,
    font,
    letterSpacing = 0,
}) {
    ctx.save();
    if (font) {
        ctx.font = font;
    }

    const value = text ?? '';
    let width = 0;

    if (!letterSpacing) {
        width = ctx.measureText(value).width;
    } else {
        for (let index = 0; index < value.length; index += 1) {
            width += ctx.measureText(value[index]).width;
            if (index < value.length - 1) {
                width += letterSpacing;
            }
        }
    }

    const metrics = ctx.measureText(value || ' ');
    ctx.restore();

    return {
        width,
        actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
    };
}

export function fitText(ctx, {
    text,
    maxWidth,
    maxFontSize,
    minFontSize = 1,
    buildFont,
    letterSpacing = 0,
}) {
    let fontSize = maxFontSize;

    while (fontSize > minFontSize) {
        const font = buildFont(fontSize);
        const { width } = measureText(ctx, { text, font, letterSpacing });
        if (width <= maxWidth) {
            return {
                fontSize,
                font,
                width,
            };
        }

        fontSize -= 1;
    }

    const font = buildFont(minFontSize);
    const { width } = measureText(ctx, { text, font, letterSpacing });

    return {
        fontSize: minFontSize,
        font,
        width,
    };
}

export function safeArea(canvasSize, inset = 0) {
    if (typeof inset === 'number') {
        return {
            x: inset,
            y: inset,
            width: canvasSize.width - inset * 2,
            height: canvasSize.height - inset * 2,
        };
    }

    const {
        top = 0,
        right = 0,
        bottom = 0,
        left = 0,
    } = inset;

    return {
        x: left,
        y: top,
        width: canvasSize.width - left - right,
        height: canvasSize.height - top - bottom,
    };
}

export function createRuntimeHelpers({ canvas, ctx, canvasSize }) {
    return {
        canvas,
        canvasSize,
        loadFonts: loadRuntimeFonts,
        ensureFont: ensureRuntimeFont,
        scaleByShortEdge(ratio) {
            return scaleByShortEdge(canvasSize, ratio);
        },
        scaleByLongEdge(ratio) {
            return scaleByLongEdge(canvasSize, ratio);
        },
        measureText(options) {
            return measureText(ctx, options);
        },
        fitText(options) {
            return fitText(ctx, options);
        },
        safeArea(inset) {
            return safeArea(canvasSize, inset);
        },
    };
}

function createScratchCanvas(width, height) {
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = Math.max(Math.round(width), 1);
    scratchCanvas.height = Math.max(Math.round(height), 1);
    scratchCanvas.style.width = `${scratchCanvas.width}px`;
    scratchCanvas.style.height = `${scratchCanvas.height}px`;
    return scratchCanvas;
}

function copyCanvasInto(sourceCanvas, targetCanvas) {
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) {
        return null;
    }

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;
    targetCanvas.style.width = sourceCanvas.style.width || `${sourceCanvas.width}px`;
    targetCanvas.style.height = sourceCanvas.style.height || `${sourceCanvas.height}px`;
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.drawImage(sourceCanvas, 0, 0);
    return targetCtx;
}

function getResizeDimensions(canvas, resize) {
    if (!resize?.width && !resize?.height) {
        return null;
    }

    const aspectRatio = canvas.width / canvas.height;
    const width = resize.width ?? Math.round(resize.height * aspectRatio);
    const height = resize.height ?? Math.round(resize.width / aspectRatio);

    if (!width || !height) {
        return null;
    }

    return {
        width: Math.max(Math.round(width), 1),
        height: Math.max(Math.round(height), 1),
    };
}

function applyResizePostProcess(canvas, resize) {
    const dimensions = getResizeDimensions(canvas, resize);
    if (!dimensions) {
        return canvas;
    }

    const resizedCanvas = createScratchCanvas(dimensions.width, dimensions.height);
    const resizedCtx = resizedCanvas.getContext('2d');
    if (!resizedCtx) {
        return canvas;
    }

    resizedCtx.imageSmoothingEnabled = true;
    resizedCtx.imageSmoothingQuality = 'high';
    resizedCtx.drawImage(canvas, 0, 0, dimensions.width, dimensions.height);
    return resizedCanvas;
}

function applyWatermarkPostProcess(canvas, watermark) {
    if (!watermark?.text) {
        return canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return canvas;
    }

    const inset = Math.max(Math.min(canvas.width, canvas.height) * 0.03, 16);
    const fontSize = Math.max(Math.min(canvas.width, canvas.height) * 0.024, 12);

    ctx.save();
    ctx.font = `${Math.round(fontSize)}px sans-serif`;
    ctx.fillStyle = watermark.color ?? 'rgba(255, 255, 255, 0.72)';
    ctx.textAlign = watermark.position === 'bottom-left' || watermark.position === 'top-left'
        ? 'left'
        : 'right';
    ctx.textBaseline = watermark.position?.startsWith('top') ? 'top' : 'bottom';

    const x = watermark.position === 'bottom-left' || watermark.position === 'top-left'
        ? inset
        : canvas.width - inset;
    const y = watermark.position?.startsWith('top')
        ? inset
        : canvas.height - inset;

    ctx.fillText(String(watermark.text), x, y);
    ctx.restore();

    return canvas;
}

export function applyGlobalPostProcessing(canvas, globalSettings = {}) {
    let processedCanvas = canvas;

    processedCanvas = applyResizePostProcess(processedCanvas, globalSettings.resize);
    processedCanvas = applyWatermarkPostProcess(processedCanvas, globalSettings.watermark);

    return processedCanvas;
}

export async function renderTemplateFrame(canvas, image, template, rawConfig, options = {}) {
    const scale = options.scale ?? 1;
    const config = resolveTemplateConfig(template, rawConfig);
    const globalSettings = createGlobalRenderSettings({
        ...(options.global ?? {}),
        scale,
        mode: options.mode ?? options.global?.mode ?? 'preview',
    });
    const layoutMetrics = calculateFrameMetrics(image, template, scale);
    const displayWidth = Math.round(layoutMetrics.fullWidth * scale);
    const displayHeight = Math.round(layoutMetrics.fullHeight * scale);
    const canvasSetup = setupCanvas(canvas, displayWidth, displayHeight, scale);

    if (!canvasSetup) {
        return null;
    }

    const { ctx } = canvasSetup;

    drawBasePhoto(ctx, image, {
        displayWidth,
        displayHeight,
        layoutMetrics,
        backgroundColor: template.backgroundColor,
    });

    const area = {
        x: 0,
        y: layoutMetrics.scaledImageHeight,
        width: layoutMetrics.scaledImageWidth,
        height: layoutMetrics.scaledBarHeight,
    };

    const canvasSize = {
        width: displayWidth,
        height: displayHeight,
    };

    const runtime = createRuntimeHelpers({
        canvas,
        ctx,
        canvasSize,
    });

    const resolveInput = await buildTemplateResolveInput({
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
        global: globalSettings,
    });
    const data = template.resolveData(resolveInput);

    template.render(ctx, {
        photo: resolveInput.photo,
        area,
        config,
        data,
        resolveInput,
        metrics: layoutMetrics,
        canvasSize,
        runtime,
    });

    const processedCanvas = applyGlobalPostProcessing(canvas, globalSettings);
    if (processedCanvas !== canvas) {
        copyCanvasInto(processedCanvas, canvas);
    }

    return {
        canvas,
        processedCanvas: processedCanvas === canvas ? canvas : processedCanvas,
        config,
        data,
        global: globalSettings,
        resolveInput,
        metrics: layoutMetrics,
        canvasSize,
        runtime,
    };
}
