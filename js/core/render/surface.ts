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

function drawEdgeExtendedSurface(ctx, image, area, surface: Record<string, any> = {}, photoArea = null) {
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

export function drawSurfaceBackground(ctx, image, area, surface: Record<string, any> = {}, options: Record<string, any> = {}) {
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
