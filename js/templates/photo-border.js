export function drawBeveledPhotoBorder(ctx, rect, borderWidth, color) {
    const snappedBorderWidth = Math.max(Math.round(borderWidth), 1);
    const chamfer = Math.max(Math.round(snappedBorderWidth * 0.72), 1);
    const innerLeft = Math.round(rect.x);
    const innerTop = Math.round(rect.y);
    const innerRight = Math.round(rect.x + rect.width);
    const innerBottom = Math.round(rect.y + rect.height);
    const outerLeft = innerLeft - snappedBorderWidth;
    const outerTop = innerTop - snappedBorderWidth;
    const outerRight = innerRight + snappedBorderWidth;
    const outerBottom = innerBottom + snappedBorderWidth;

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
