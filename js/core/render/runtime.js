import { loadRuntimeFonts, ensureRuntimeFont } from '../fonts/index.js';
import { buildTemplateResolveInput, createGlobalRenderSettings } from './input.js';
import { resolveTemplateAppearance, resolveTemplateConfig } from '../templates/registry.js';

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

function normalizePositiveRatio(value, fallbackValue) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallbackValue;
}

function normalizeNonNegativeRatio(value, fallbackValue) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallbackValue;
}

function hasCustomPhotoArea(template) {
    return ['photoAreaXRatio', 'photoAreaYRatio', 'photoAreaWidthRatio', 'photoAreaHeightRatio']
        .some((key) => Number.isFinite(Number(template?.[key])));
}

export function calculateFrameMetrics(image, template, scale = 1) {
    if (typeof template?.calculateFrameMetrics === 'function') {
        return template.calculateFrameMetrics({
            image,
            template,
            scale,
        });
    }

    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const barBasisSize = getBasisSize(imageWidth, imageHeight, template.barSizeBasis);
    const fontBasisSize = getBasisSize(imageWidth, imageHeight, template.fontSizeBasis);
    const barHeight = Math.round(barBasisSize * template.barHeightRatio);
    const rawFontSize = Math.round(fontBasisSize * template.fontSizeRatio);
    const fontSize = Math.max(template.minFontSize ?? 12, rawFontSize);
    const canvasWidthRatio = normalizePositiveRatio(template.canvasWidthRatio, 1);
    const canvasHeightRatio = normalizePositiveRatio(
        template.canvasHeightRatio,
        (imageHeight + barHeight) / imageHeight
    );
    const fullWidth = Math.round(imageWidth * canvasWidthRatio);
    const fullHeight = Math.round(imageHeight * canvasHeightRatio);
    const photoArea = hasCustomPhotoArea(template)
        ? {
            x: Math.round(fullWidth * normalizeNonNegativeRatio(template.photoAreaXRatio, 0)),
            y: Math.round(fullHeight * normalizeNonNegativeRatio(template.photoAreaYRatio, 0)),
            width: Math.round(fullWidth * normalizePositiveRatio(template.photoAreaWidthRatio, imageWidth / fullWidth)),
            height: Math.round(fullHeight * normalizePositiveRatio(template.photoAreaHeightRatio, imageHeight / fullHeight)),
        }
        : {
            x: 0,
            y: 0,
            width: imageWidth,
            height: imageHeight,
        };

    return {
        imageWidth,
        imageHeight,
        fullWidth,
        fullHeight,
        barBasisSize,
        fontBasisSize,
        barHeight,
        fontSize,
        photoArea,
        textRunBaseFontSize: fontSize,
        scaledImageWidth: photoArea.width * scale,
        scaledImageHeight: photoArea.height * scale,
        scaledPhotoArea: {
            x: photoArea.x * scale,
            y: photoArea.y * scale,
            width: photoArea.width * scale,
            height: photoArea.height * scale,
        },
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
    ctx.drawImage(
        image,
        layoutMetrics.scaledPhotoArea.x,
        layoutMetrics.scaledPhotoArea.y,
        layoutMetrics.scaledPhotoArea.width,
        layoutMetrics.scaledPhotoArea.height
    );
}

function drawCoverImage(ctx, image, area) {
    const imageWidth = image?.naturalWidth ?? image?.width ?? 0;
    const imageHeight = image?.naturalHeight ?? image?.height ?? 0;
    if (!imageWidth || !imageHeight || !area.width || !area.height) {
        return;
    }

    const scale = Math.max(area.width / imageWidth, area.height / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const drawX = area.x + (area.width - drawWidth) / 2;
    const drawY = area.y + (area.height - drawHeight) / 2;

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function createSurfaceScratchCanvas(referenceCanvas, width, height) {
    const scratchCanvas = referenceCanvas?.ownerDocument?.createElement('canvas')
        ?? document.createElement('canvas');
    scratchCanvas.width = Math.max(1, Math.round(width));
    scratchCanvas.height = Math.max(1, Math.round(height));
    return scratchCanvas;
}

function drawEdgeExtendedSurface(ctx, image, area, surface = {}, photoArea = null) {
    const imageWidth = image?.naturalWidth ?? image?.width ?? 0;
    const imageHeight = image?.naturalHeight ?? image?.height ?? 0;
    if (!imageWidth || !imageHeight || !area.width || !area.height) {
        return false;
    }

    const rawLocalPhotoArea = photoArea
        ? {
            x: photoArea.x - area.x,
            y: photoArea.y - area.y,
            width: photoArea.width,
            height: photoArea.height,
        }
        : {
            x: 0,
            y: 0,
            width: area.width,
            height: area.height,
        };
    const photoAreaOverlapsArea = rawLocalPhotoArea.x < area.width
        && rawLocalPhotoArea.y < area.height
        && rawLocalPhotoArea.x + rawLocalPhotoArea.width > 0
        && rawLocalPhotoArea.y + rawLocalPhotoArea.height > 0;
    const localPhotoArea = photoAreaOverlapsArea
        ? {
            x: clamp(rawLocalPhotoArea.x, 0, area.width),
            y: clamp(rawLocalPhotoArea.y, 0, area.height),
            width: clamp(rawLocalPhotoArea.width, 0, area.width),
            height: clamp(rawLocalPhotoArea.height, 0, area.height),
        }
        : {
            x: 0,
            y: 0,
            width: area.width,
            height: area.height,
        };

    const sourceBandRatio = Number.isFinite(Number(surface.sourceBandRatio))
        ? Number(surface.sourceBandRatio)
        : 0.03;
    const sourceBandSize = clamp(
        Math.round(Math.min(imageWidth, imageHeight) * sourceBandRatio),
        1,
        Math.max(1, Math.round(Math.min(imageWidth, imageHeight) * 0.2))
    );
    const blur = Number.isFinite(Number(surface.blur)) ? Number(surface.blur) : 32;
    const saturate = Number.isFinite(Number(surface.saturate)) ? Number(surface.saturate) : 1.05;
    const brightness = Number.isFinite(Number(surface.brightness)) ? Number(surface.brightness) : 0.82;
    const contrast = Number.isFinite(Number(surface.contrast)) ? Number(surface.contrast) : 1.18;
    const ambientBlur = Number.isFinite(Number(surface.ambientBlur))
        ? Number(surface.ambientBlur)
        : blur * 1.4;
    const ambientOpacity = Number.isFinite(Number(surface.ambientOpacity))
        ? Number(surface.ambientOpacity)
        : 0.42;
    const extendedOpacity = Number.isFinite(Number(surface.extendedOpacity))
        ? Number(surface.extendedOpacity)
        : 0.82;
    const overlayColor = surface.overlayColor ?? '#17191d';
    const overlayOpacity = Number.isFinite(Number(surface.overlayOpacity))
        ? Number(surface.overlayOpacity)
        : 0.36;

    const scratchCanvas = createSurfaceScratchCanvas(ctx.canvas, area.width, area.height);
    const scratchCtx = scratchCanvas.getContext('2d');
    if (!scratchCtx) {
        return false;
    }

    scratchCtx.drawImage(
        image,
        localPhotoArea.x,
        localPhotoArea.y,
        localPhotoArea.width,
        localPhotoArea.height
    );

    if (localPhotoArea.y > 0) {
        scratchCtx.drawImage(
            image,
            0,
            0,
            imageWidth,
            sourceBandSize,
            localPhotoArea.x,
            0,
            localPhotoArea.width,
            localPhotoArea.y
        );
    }

    const bottomGap = area.height - (localPhotoArea.y + localPhotoArea.height);
    if (bottomGap > 0) {
        scratchCtx.drawImage(
            image,
            0,
            imageHeight - sourceBandSize,
            imageWidth,
            sourceBandSize,
            localPhotoArea.x,
            localPhotoArea.y + localPhotoArea.height,
            localPhotoArea.width,
            bottomGap
        );
    }

    if (localPhotoArea.x > 0) {
        scratchCtx.drawImage(
            image,
            0,
            0,
            sourceBandSize,
            imageHeight,
            0,
            localPhotoArea.y,
            localPhotoArea.x,
            localPhotoArea.height
        );
    }

    const rightGap = area.width - (localPhotoArea.x + localPhotoArea.width);
    if (rightGap > 0) {
        scratchCtx.drawImage(
            image,
            imageWidth - sourceBandSize,
            0,
            sourceBandSize,
            imageHeight,
            localPhotoArea.x + localPhotoArea.width,
            localPhotoArea.y,
            rightGap,
            localPhotoArea.height
        );
    }

    if (localPhotoArea.x > 0 && localPhotoArea.y > 0) {
        scratchCtx.drawImage(
            image,
            0,
            0,
            sourceBandSize,
            sourceBandSize,
            0,
            0,
            localPhotoArea.x,
            localPhotoArea.y
        );
    }

    if (rightGap > 0 && localPhotoArea.y > 0) {
        scratchCtx.drawImage(
            image,
            imageWidth - sourceBandSize,
            0,
            sourceBandSize,
            sourceBandSize,
            localPhotoArea.x + localPhotoArea.width,
            0,
            rightGap,
            localPhotoArea.y
        );
    }

    if (localPhotoArea.x > 0 && bottomGap > 0) {
        scratchCtx.drawImage(
            image,
            0,
            imageHeight - sourceBandSize,
            sourceBandSize,
            sourceBandSize,
            0,
            localPhotoArea.y + localPhotoArea.height,
            localPhotoArea.x,
            bottomGap
        );
    }

    if (rightGap > 0 && bottomGap > 0) {
        scratchCtx.drawImage(
            image,
            imageWidth - sourceBandSize,
            imageHeight - sourceBandSize,
            sourceBandSize,
            sourceBandSize,
            localPhotoArea.x + localPhotoArea.width,
            localPhotoArea.y + localPhotoArea.height,
            rightGap,
            bottomGap
        );
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();
    ctx.globalAlpha = ambientOpacity;
    ctx.filter = `blur(${ambientBlur}px) saturate(${saturate}) brightness(${brightness}) contrast(${contrast})`;
    drawCoverImage(ctx, image, area);
    ctx.globalAlpha = extendedOpacity;
    ctx.filter = `blur(${blur}px) saturate(${saturate}) brightness(${brightness}) contrast(${contrast})`;
    ctx.drawImage(scratchCanvas, area.x, area.y, area.width, area.height);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    if (overlayOpacity > 0) {
        ctx.globalAlpha = overlayOpacity;
        ctx.fillStyle = overlayColor;
        ctx.fillRect(area.x, area.y, area.width, area.height);
        ctx.globalAlpha = 1;
    }

    ctx.restore();
    return true;
}

export function drawSurfaceBackground(ctx, image, area, surface = {}, options = {}) {
    if (!area || area.width <= 0 || area.height <= 0) {
        return;
    }

    const type = surface.type ?? 'solid';
    const photoArea = options.photoArea ?? null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();

    if (type === 'photoBlur') {
        const blur = Number.isFinite(Number(surface.blur)) ? Number(surface.blur) : 24;
        const saturate = Number.isFinite(Number(surface.saturate)) ? Number(surface.saturate) : 1.2;
        const brightness = Number.isFinite(Number(surface.brightness)) ? Number(surface.brightness) : 1;
        ctx.filter = `blur(${blur}px) saturate(${saturate}) brightness(${brightness})`;
        drawCoverImage(ctx, image, area);
        ctx.filter = 'none';

        if (surface.overlayColor) {
            ctx.globalAlpha = Number.isFinite(Number(surface.overlayOpacity))
                ? Number(surface.overlayOpacity)
                : 0.5;
            ctx.fillStyle = surface.overlayColor;
            ctx.fillRect(area.x, area.y, area.width, area.height);
            ctx.globalAlpha = 1;
        }
    } else if (type === 'edgeExtendBlur') {
        ctx.restore();
        if (drawEdgeExtendedSurface(ctx, image, area, surface, photoArea)) {
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(area.x, area.y, area.width, area.height);
        ctx.clip();
        ctx.fillStyle = surface.color ?? '#111111';
        ctx.fillRect(area.x, area.y, area.width, area.height);
    } else {
        ctx.fillStyle = surface.color ?? '#ffffff';
        ctx.fillRect(area.x, area.y, area.width, area.height);
    }

    ctx.restore();
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
        drawSurface(area, surface, image) {
            return drawSurfaceBackground(ctx, image, area, surface);
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

function drawCanvasScaled(sourceCanvas, targetWidth, targetHeight) {
    const targetCanvas = createScratchCanvas(targetWidth, targetHeight);
    const targetCtx = targetCanvas.getContext('2d');

    if (!targetCtx) {
        return sourceCanvas;
    }

    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    return targetCanvas;
}

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

function applySharpenPostProcess(canvas, options = {}) {
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
        color: appearance.backgroundColor ?? data?.backgroundColor ?? template.backgroundColor,
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

    const area = {
        x: 0,
        y: layoutMetrics.scaledPhotoArea.y + layoutMetrics.scaledPhotoArea.height,
        width: displayWidth,
        height: Math.max(displayHeight - (layoutMetrics.scaledPhotoArea.y + layoutMetrics.scaledPhotoArea.height), 0),
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

    if (appearance.barBackground) {
        drawSurfaceBackground(ctx, image, area, appearance.barBackground, {
            photoArea: layoutMetrics.scaledPhotoArea,
        });
    }

    template.render(ctx, {
        template,
        photo: resolveInput.photo,
        area,
        config,
        data,
        appearance,
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
        appearance,
        global: globalSettings,
        resolveInput,
        metrics: layoutMetrics,
        canvasSize,
        runtime,
    };
}
