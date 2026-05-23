import { getOverlayRenderer } from '../templates/capabilities/overlays.ts';

export function renderDeclarativeOverlays(ctx: CanvasRenderingContext2D, args: Record<string, any> = {}) {
    const overlays = Array.isArray(args.template?.overlays) ? args.template.overlays : [];

    overlays.forEach((overlay) => {
        const renderOverlay = getOverlayRenderer(overlay?.type);
        if (renderOverlay) {
            renderOverlay(ctx, overlay, args);
        }
    });
}
