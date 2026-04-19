import { drawOptionalThinPhotoBorder } from '../photo-border.js';

export function renderSimpleMatTemplate(ctx, args) {
    const { config, metrics, canvasSize } = args;
    drawOptionalThinPhotoBorder(ctx, {
        enabled: config.showThinBorder,
        rect: metrics.scaledPhotoArea,
        canvasWidth: canvasSize.width,
    });
}
