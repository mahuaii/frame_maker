export function drawBeveledPhotoBorder(ctx, rect, borderWidth, color) {
    if (!ctx || !rect || borderWidth <= 0) {
        return;
    }

    const x = rect.x;
    const y = rect.y;
    const width = rect.width;
    const height = rect.height;
    const lineWidth = Math.max(1, borderWidth);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(x + lineWidth / 2, y + lineWidth / 2);
    ctx.lineTo(x + width - lineWidth / 2, y + lineWidth / 2);
    ctx.lineTo(x + width - lineWidth / 2, y + height - lineWidth / 2);
    ctx.lineTo(x + lineWidth / 2, y + height - lineWidth / 2);
    ctx.closePath();
    ctx.stroke();

    const bevelWidth = Math.max(1, lineWidth * 0.65);
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, bevelWidth);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + bevelWidth / 2, y + bevelWidth / 2);
    ctx.lineTo(x + width - bevelWidth / 2, y + bevelWidth / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + bevelWidth / 2, y + bevelWidth / 2);
    ctx.lineTo(x + bevelWidth / 2, y + height - bevelWidth / 2);
    ctx.stroke();
    ctx.restore();
}

export function resolvePhotoBorderWidth(rect, widthRatio = 0.0022) {
    const shortEdge = Math.min(rect?.width ?? 0, rect?.height ?? 0);
    return Math.max(1, Math.round(shortEdge * widthRatio));
}
