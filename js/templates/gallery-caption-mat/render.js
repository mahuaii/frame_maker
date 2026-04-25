import { getAppearanceColor } from '../../core/templates/registry.js';
import { drawBeveledPhotoBorder } from '../photo-border.js';

export function renderGalleryCaptionMatTemplate(ctx, args) {
    const { appearance, config, metrics, canvasSize } = args;
    const borderColor = getAppearanceColor(appearance, 'photoBorder');

    if (!config.showThinBorder || !metrics.scaledPhotoArea || !borderColor) {
        return;
    }

    const borderWidth = Math.max(canvasSize.width * 0.0022, 1);
    drawBeveledPhotoBorder(ctx, metrics.scaledPhotoArea, borderWidth, borderColor);
}
