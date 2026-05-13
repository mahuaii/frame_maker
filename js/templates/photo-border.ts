export function drawBeveledPhotoBorder(ctx, rect, borderWidth, color) {
    if (!rect || !color || rect.width <= 0 || rect.height <= 0) {
        return;
    }

    const resolvedBorderWidth = Math.max(Number(borderWidth) || 0, 1);
    const chamfer = Math.max(resolvedBorderWidth * 0.72, 1);
    const innerLeft = rect.x;
    const innerTop = rect.y;
    const innerRight = rect.x + rect.width;
    const innerBottom = rect.y + rect.height;
    const outerLeft = innerLeft - resolvedBorderWidth;
    const outerTop = innerTop - resolvedBorderWidth;
    const outerRight = innerRight + resolvedBorderWidth;
    const outerBottom = innerBottom + resolvedBorderWidth;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(outerLeft + chamfer, outerTop);
    ctx.lineTo(outerRight - chamfer, outerTop);
    ctx.lineTo(outerRight, outerTop + chamfer);
    ctx.lineTo(outerRight, outerBottom - chamfer);
    ctx.lineTo(outerRight - chamfer, outerBottom);
    ctx.lineTo(outerLeft + chamfer, outerBottom);
    ctx.lineTo(outerLeft, outerBottom - chamfer);
    ctx.lineTo(outerLeft, outerTop + chamfer);
    ctx.closePath();

    ctx.moveTo(innerLeft, innerTop);
    ctx.lineTo(innerLeft, innerBottom);
    ctx.lineTo(innerRight, innerBottom);
    ctx.lineTo(innerRight, innerTop);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();
}

export function resolvePhotoBorderWidth(rect, widthRatio = 0.0022) {
    if (!rect || rect.width <= 0 || rect.height <= 0) {
        return 1;
    }

    const numericWidthRatio = Number(widthRatio);
    const resolvedWidthRatio = Number.isFinite(numericWidthRatio) && numericWidthRatio > 0
        ? numericWidthRatio
        : 0.0022;

    return Math.max(Math.min(rect.width, rect.height) * resolvedWidthRatio, 1);
}

export function drawOptionalThinPhotoBorder(ctx, {
    enabled,
    rect,
    color,
    widthRatio = 0.0022,
}) {
    if (!enabled || !rect || !color) {
        return;
    }

    const borderWidth = resolvePhotoBorderWidth(rect, widthRatio);
    drawBeveledPhotoBorder(ctx, rect, borderWidth, color);
}
