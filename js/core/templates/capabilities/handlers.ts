import type { TemplateResolveData } from '../../../../src/types/template';
import type { TemplateRenderArgs, TemplateResolveInput } from '../../../../src/types/render';

type ResolveDataHandler = (input: TemplateResolveInput) => TemplateResolveData;
type RenderOverlayHandler = (ctx: CanvasRenderingContext2D, args: TemplateRenderArgs) => void;

type TemplateHandlersDeclaration = {
    resolveData?: string;
    renderOverlay?: string;
};

const RESOLVE_DATA_HANDLERS: Record<string, ResolveDataHandler> = Object.freeze({});
const RENDER_OVERLAY_HANDLERS: Record<string, RenderOverlayHandler> = Object.freeze({});

function defaultResolveTemplateData(): TemplateResolveData {
    return {};
}

function defaultRenderOverlay(_ctx: CanvasRenderingContext2D, _args: TemplateRenderArgs) {
    // Templates without a handler rely on declarative background/photo/text/overlay rendering.
}

function normalizeHandlers(handlers: unknown): TemplateHandlersDeclaration {
    if (handlers === null || handlers === undefined) {
        return {};
    }

    if (!handlers || typeof handlers !== 'object' || Array.isArray(handlers)) {
        throw new Error('Template handlers must be an object.');
    }

    return handlers as TemplateHandlersDeclaration;
}

export function resolveTemplateHandlerCapabilities(handlers: unknown = {}, templateId = 'unknown') {
    const normalizedHandlers = normalizeHandlers(handlers);
    const resolveDataKey = normalizedHandlers.resolveData;
    const renderOverlayKey = normalizedHandlers.renderOverlay;

    if (resolveDataKey !== undefined && !RESOLVE_DATA_HANDLERS[resolveDataKey]) {
        throw new Error(`Template "${templateId}" references unknown resolveData handler "${resolveDataKey}".`);
    }

    if (renderOverlayKey !== undefined && !RENDER_OVERLAY_HANDLERS[renderOverlayKey]) {
        throw new Error(`Template "${templateId}" references unknown renderOverlay handler "${renderOverlayKey}".`);
    }

    return {
        resolveData: resolveDataKey ? RESOLVE_DATA_HANDLERS[resolveDataKey] : defaultResolveTemplateData,
        renderOverlay: renderOverlayKey ? RENDER_OVERLAY_HANDLERS[renderOverlayKey] : defaultRenderOverlay,
    };
}
