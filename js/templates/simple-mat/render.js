import { drawOptionalThinPhotoBorder } from '../photo-border.js';

export function renderSimpleMatTemplate(ctx, args) {
    const { appearance, config, metrics, canvasSize } = args;
    drawOptionalThinPhotoBorder(ctx, {
        appearanceKey: appearance.key,
        enabled: config.showThinBorder,
        rect: metrics.scaledPhotoArea,
        canvasWidth: canvasSize.width,
    });
}
