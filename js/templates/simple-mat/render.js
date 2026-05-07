import { getAppearanceColor } from '../../core/templates/registry.js';
import { drawOptionalThinPhotoBorder } from '../photo-border.js';

export function renderSimpleMatTemplate(ctx, args) {
    const { appearance, config, metrics } = args;
    const borderColor = getAppearanceColor(appearance, 'photoBorder');

    drawOptionalThinPhotoBorder(ctx, {
        enabled: config.showThinBorder,
        rect: metrics.scaledPhotoArea,
        color: borderColor,
    });
}
