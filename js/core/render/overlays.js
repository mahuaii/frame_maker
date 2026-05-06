import { getAppearanceColor } from '../templates/appearance.js';
import { drawBeveledPhotoBorder } from '../../templates/photo-border.js';

function isOverlayEnabled(overlay, config = {}) {
    if (!overlay?.enabledConfigKey) {
        return true;
    }

    return Boolean(config[overlay.enabledConfigKey]);
}

function getOverlayColor(overlay, appearance) {
    return getAppearanceColor(
        appearance,
        overlay.colorToken ?? 'textPrimary',
        overlay.fallbackColor ?? '#000000'
    );
}

function renderPhotoBorder(ctx, overlay, args) {
    if (!isOverlayEnabled(overlay, args.config)) {
        return;
    }

    const shape = overlay.shape ?? 'beveled';
    if (shape !== 'beveled') {
        return;
    }

    const rect = args.metrics?.scaledPhotoArea;
    const canvasWidth = args.canvasSize?.width ?? 0;
    if (!rect || !canvasWidth) {
        return;
    }

    const widthRatio = Number.isFinite(Number(overlay.widthRatio))
        ? Number(overlay.widthRatio)
        : 0.0022;
    const borderWidth = Math.max(canvasWidth * widthRatio, 1);

    drawBeveledPhotoBorder(ctx, rect, borderWidth, getOverlayColor(overlay, args.appearance));
}

export function renderDeclarativeOverlays(ctx, args = {}) {
    const overlays = Array.isArray(args.template?.overlays) ? args.template.overlays : [];

    overlays.forEach((overlay) => {
        if (overlay?.type === 'photoBorder') {
            renderPhotoBorder(ctx, overlay, args);
        }
    });
}
