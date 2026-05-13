import { createScratchCanvas, drawCanvasScaled } from './canvas.ts';

function resizeCanvasByAreaSampling(sourceCanvas, targetWidth, targetHeight) {
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceCtx) {
        return drawCanvasScaled(sourceCanvas, targetWidth, targetHeight);
    }

    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    const sourceImageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
    const sourceData = sourceImageData.data;
    const targetCanvas = createScratchCanvas(targetWidth, targetHeight);
    const targetCtx = targetCanvas.getContext('2d');

    if (!targetCtx) {
        return drawCanvasScaled(sourceCanvas, targetWidth, targetHeight);
    }

    const targetImageData = targetCtx.createImageData(targetWidth, targetHeight);
    const targetData = targetImageData.data;
    const scaleX = sourceWidth / targetWidth;
    const scaleY = sourceHeight / targetHeight;

    for (let targetY = 0; targetY < targetHeight; targetY += 1) {
        const srcTop = targetY * scaleY;
        const srcBottom = srcTop + scaleY;
        const startY = Math.floor(srcTop);
        const endY = Math.min(Math.ceil(srcBottom), sourceHeight);

        for (let targetX = 0; targetX < targetWidth; targetX += 1) {
            const srcLeft = targetX * scaleX;
            const srcRight = srcLeft + scaleX;
            const startX = Math.floor(srcLeft);
            const endX = Math.min(Math.ceil(srcRight), sourceWidth);

            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;
            let totalWeight = 0;

            for (let sourceY = startY; sourceY < endY; sourceY += 1) {
                const yCoverage = Math.min(sourceY + 1, srcBottom) - Math.max(sourceY, srcTop);
                if (yCoverage <= 0) {
                    continue;
                }

                for (let sourceX = startX; sourceX < endX; sourceX += 1) {
                    const xCoverage = Math.min(sourceX + 1, srcRight) - Math.max(sourceX, srcLeft);
                    const weight = xCoverage * yCoverage;
                    if (weight <= 0) {
                        continue;
                    }

                    const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
                    const sourceAlpha = sourceData[sourceIndex + 3] / 255;
                    const premultipliedWeight = weight * sourceAlpha;

                    red += sourceData[sourceIndex] * premultipliedWeight;
                    green += sourceData[sourceIndex + 1] * premultipliedWeight;
                    blue += sourceData[sourceIndex + 2] * premultipliedWeight;
                    alpha += sourceAlpha * weight;
                    totalWeight += weight;
                }
            }

            const targetIndex = (targetY * targetWidth + targetX) * 4;
            if (alpha > 0) {
                targetData[targetIndex] = Math.round(red / alpha);
                targetData[targetIndex + 1] = Math.round(green / alpha);
                targetData[targetIndex + 2] = Math.round(blue / alpha);
                targetData[targetIndex + 3] = Math.round((alpha / totalWeight) * 255);
                continue;
            }

            targetData[targetIndex] = 0;
            targetData[targetIndex + 1] = 0;
            targetData[targetIndex + 2] = 0;
            targetData[targetIndex + 3] = 0;
        }
    }

    targetCtx.putImageData(targetImageData, 0, 0);
    return targetCanvas;
}

function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function getSharpenStrength(sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const downscaleRatio = Math.max(
        sourceWidth / targetWidth,
        sourceHeight / targetHeight,
    );

    if (downscaleRatio <= 1) {
        return 0;
    }

    if (downscaleRatio <= 1.5) {
        return 0.18;
    }

    if (downscaleRatio <= 2.5) {
        return 0.28;
    }

    return 0.36;
}

function applySharpenPostProcess(canvas, options: Record<string, any> = {}) {
    const strength = Number(options.strength);
    if (!Number.isFinite(strength) || strength <= 0) {
        return canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        return canvas;
    }

    const width = canvas.width;
    const height = canvas.height;
    if (width < 2 || height < 2) {
        return canvas;
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const source = imageData.data;
    const output = new Uint8ClampedArray(source);
    const centerWeight = 1 + strength * 4;
    const neighborWeight = -strength;

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = (y * width + x) * 4;
            const left = index - 4;
            const right = index + 4;
            const top = index - width * 4;
            const bottom = index + width * 4;

            output[index] = clampChannel(
                source[index] * centerWeight
                + source[left] * neighborWeight
                + source[right] * neighborWeight
                + source[top] * neighborWeight
                + source[bottom] * neighborWeight
            );
            output[index + 1] = clampChannel(
                source[index + 1] * centerWeight
                + source[left + 1] * neighborWeight
                + source[right + 1] * neighborWeight
                + source[top + 1] * neighborWeight
                + source[bottom + 1] * neighborWeight
            );
            output[index + 2] = clampChannel(
                source[index + 2] * centerWeight
                + source[left + 2] * neighborWeight
                + source[right + 2] * neighborWeight
                + source[top + 2] * neighborWeight
                + source[bottom + 2] * neighborWeight
            );
        }
    }

    imageData.data.set(output);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function downscaleCanvasProgressively(sourceCanvas, targetWidth, targetHeight) {
    let currentCanvas = sourceCanvas;

    while (
        currentCanvas.width / targetWidth > 2
        || currentCanvas.height / targetHeight > 2
    ) {
        const nextWidth = Math.max(
            targetWidth,
            Math.round(currentCanvas.width / 2),
        );
        const nextHeight = Math.max(
            targetHeight,
            Math.round(currentCanvas.height / 2),
        );

        if (nextWidth === currentCanvas.width && nextHeight === currentCanvas.height) {
            break;
        }

        currentCanvas = drawCanvasScaled(currentCanvas, nextWidth, nextHeight);
    }

    if (currentCanvas.width === targetWidth && currentCanvas.height === targetHeight) {
        return currentCanvas;
    }

    const resizedCanvas = resizeCanvasByAreaSampling(currentCanvas, targetWidth, targetHeight);
    const sharpenStrength = getSharpenStrength(
        sourceCanvas.width,
        sourceCanvas.height,
        targetWidth,
        targetHeight,
    );

    return applySharpenPostProcess(resizedCanvas, { strength: sharpenStrength });
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

    if (dimensions.width >= canvas.width && dimensions.height >= canvas.height) {
        return drawCanvasScaled(canvas, dimensions.width, dimensions.height);
    }

    return downscaleCanvasProgressively(canvas, dimensions.width, dimensions.height);
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

export function applyGlobalPostProcessing(canvas, globalSettings: Record<string, any> = {}) {
    let processedCanvas = canvas;

    processedCanvas = applyResizePostProcess(processedCanvas, globalSettings.resize);
    processedCanvas = applyWatermarkPostProcess(processedCanvas, globalSettings.watermark);

    return processedCanvas;
}
