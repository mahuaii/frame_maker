import { drawTextLayout } from './draw.js';
import { layoutTextModel } from './layout.js';

export {
    ANCHOR_KEYS,
    DEFAULT_GROUP,
    DEFAULT_IMAGE_ITEM,
    DEFAULT_SEPARATOR_ITEM,
    DEFAULT_TEXT_ITEM,
    DEFAULT_TEXT_STYLE,
    FRAME_REGIONS,
    TEXT_ALIGNS,
    TEXT_DIRECTIONS,
    TEXT_ITEM_TYPES,
    TEXT_ROTATIONS,
    cloneTextModel,
    createDefaultTextGroup,
    createDefaultTextItem,
    createTextObjectId,
    getTextBaseUnit,
    mergeTextStyles,
    normalizeTextModel,
} from './schema.js';
export {
    DEFAULT_TOKEN_RESOLVERS,
    resolveTextTokenResult,
    resolveTextTokens,
    resolveTokenValue,
} from './tokens.js';
export {
    clearTextImageCache,
    loadTextImage,
    releaseTextImageSource,
} from './image-cache.js';
export {
    resolveAppearanceColor,
    resolveRenderedTextStyle,
} from './measure.js';
export { layoutTextModel } from './layout.js';
export { drawTextLayout } from './draw.js';

export async function renderTextModel(ctx, args = {}) {
    if (!ctx) {
        return [];
    }

    const textModel = args.textModel ?? args.template?.textGroups ?? [];
    const runtime = args.runtime ?? {};

    if (typeof runtime.loadFonts === 'function') {
        await runtime.loadFonts();
    }

    const layout = await layoutTextModel(ctx, textModel, {
        template: args.template,
        data: args.data,
        resolveInput: args.resolveInput,
        appearance: args.appearance,
        metrics: args.metrics,
        runtime,
        tokens: args.tokens,
        photo: args.photo,
        exif: args.exif,
    });

    drawTextLayout(ctx, layout);

    return layout;
}
