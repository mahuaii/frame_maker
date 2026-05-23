import { getAppearanceColor } from '../appearance.ts';
import { drawBeveledPhotoBorder, resolvePhotoBorderWidth } from './photo-border.ts';

type OverlayRenderer = (ctx: CanvasRenderingContext2D, overlay: Record<string, any>, args: Record<string, any>) => void;

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
    if (!rect) {
        return;
    }

    const widthRatio = Number.isFinite(Number(overlay.widthRatio))
        ? Number(overlay.widthRatio)
        : 0.0022;
    const borderWidth = resolvePhotoBorderWidth(rect, widthRatio);

    drawBeveledPhotoBorder(ctx, rect, borderWidth, getOverlayColor(overlay, args.appearance));
}

const OVERLAY_RENDERERS: Record<string, OverlayRenderer> = Object.freeze({
    photoBorder: renderPhotoBorder,
});

export function getOverlayRenderer(type: string | undefined): OverlayRenderer | null {
    if (!type) {
        return null;
    }

    return OVERLAY_RENDERERS[type] ?? null;
}

export function assertKnownOverlayCapabilities(overlays: unknown = [], templateId = 'unknown') {
    if (!Array.isArray(overlays)) {
        return;
    }

    overlays.forEach((overlay) => {
        if (!overlay || typeof overlay !== 'object') {
            return;
        }

        const type = (overlay as Record<string, unknown>).type;
        if (typeof type === 'string' && !getOverlayRenderer(type)) {
            throw new Error(`Template "${templateId}" references unknown overlay capability "${type}".`);
        }
    });
}
