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

export function createScratchCanvas(width, height) {
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = Math.max(Math.round(width), 1);
    scratchCanvas.height = Math.max(Math.round(height), 1);
    scratchCanvas.style.width = `${scratchCanvas.width}px`;
    scratchCanvas.style.height = `${scratchCanvas.height}px`;
    return scratchCanvas;
}

export function copyCanvasInto(sourceCanvas, targetCanvas) {
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

export function drawCanvasScaled(sourceCanvas, targetWidth, targetHeight) {
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
