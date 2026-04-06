import { drawBeveledPhotoBorder } from '../photo-border.js';

const BORDER_WIDTH_RATIO = 0.0022;

export function renderSimpleMatTemplate(ctx, args) {
    const { appearance, config, metrics, canvasSize } = args;

    if (appearance.key !== 'white' || !config.showThinBorder) {
        return;
    }

    const borderWidth = Math.max(canvasSize.width * BORDER_WIDTH_RATIO, 1);
    drawBeveledPhotoBorder(ctx, metrics.scaledPhotoArea, borderWidth, '#000000');
}
