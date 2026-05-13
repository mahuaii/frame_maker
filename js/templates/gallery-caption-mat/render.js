import { getAppearanceColor } from '../../core/templates/registry.ts';
import { drawBeveledPhotoBorder, resolvePhotoBorderWidth } from '../photo-border.js';

export function renderGalleryCaptionMatTemplate(ctx, args) {
    const { appearance, config, metrics } = args;
    const borderColor = getAppearanceColor(appearance, 'photoBorder');

    if (!config.showThinBorder || !metrics.scaledPhotoArea || !borderColor) {
        return;
    }

    const borderWidth = resolvePhotoBorderWidth(metrics.scaledPhotoArea, 0.0022);
    drawBeveledPhotoBorder(ctx, metrics.scaledPhotoArea, borderWidth, borderColor);
}
