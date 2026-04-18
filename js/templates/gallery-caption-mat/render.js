import { getAppearanceColor } from '../../core/templates/registry.js';
import { drawOptionalThinPhotoBorder } from '../photo-border.js';

export function renderGalleryCaptionMatTemplate(ctx, args) {
    const { appearance, config, metrics, canvasSize } = args;
    const borderColor = getAppearanceColor(appearance, 'photoBorder', '#000000');

    drawOptionalThinPhotoBorder(ctx, {
        appearanceKey: appearance.key,
        enabled: config.showThinBorder,
        rect: metrics.scaledPhotoArea,
        canvasWidth: canvasSize.width,
        color: borderColor,
    });
}
