import { buildCanvasFont } from '../fonts/index.js';
import { getAppearanceColor } from '../templates/appearance.js';
import { loadTextImage } from './image-cache.js';
import { DEFAULT_TEXT_STYLE, TEXT_DIRECTIONS, TEXT_ITEM_TYPES, getTextBaseUnit } from './schema.js';

function normalizeNumber(value, fallbackValue) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallbackValue;
}

function normalizePositiveNumber(value, fallbackValue) {
    return Math.max(normalizeNumber(value, fallbackValue), 0);
}

function measureLineWidth(ctx, text, letterSpacing = 0) {
    if (!letterSpacing || text.length <= 1) {
        return ctx.measureText(text).width;
    }

    let width = 0;
    for (let index = 0; index < text.length; index += 1) {
        width += ctx.measureText(text[index]).width;
        if (index < text.length - 1) {
            width += letterSpacing;
        }
    }

    return width;
}

function resolveFontIds(style) {
    const fontId = style.fontId ?? DEFAULT_TEXT_STYLE.fontId;
    return {
        fontIdEn: style.fontIdEn ?? fontId,
        fontIdZh: style.fontIdZh ?? fontId,
    };
}

export function resolveAppearanceColor(appearance, colorToken, fallbackColor) {
    return colorToken
        ? getAppearanceColor(appearance, colorToken, fallbackColor)
        : fallbackColor;
}

export function resolveRenderedTextStyle(style = {}, context = {}) {
    const metrics = context.metrics ?? {};
    const appearance = context.appearance ?? {};
    const baseUnit = getTextBaseUnit(metrics);
    const resolvedStyle = {
        ...DEFAULT_TEXT_STYLE,
        ...style,
    };
    const fontScale = normalizePositiveNumber(resolvedStyle.fontScale, DEFAULT_TEXT_STYLE.fontScale);
    const fontSize = Math.max(baseUnit * fontScale, 1);
    const lineHeightScale = normalizePositiveNumber(
        resolvedStyle.lineHeightScale,
        DEFAULT_TEXT_STYLE.lineHeightScale
    ) || DEFAULT_TEXT_STYLE.lineHeightScale;
    const letterSpacingScale = normalizeNumber(
        resolvedStyle.letterSpacingScale,
        DEFAULT_TEXT_STYLE.letterSpacingScale
    );
    const fontWeight = normalizeNumber(resolvedStyle.fontWeight, DEFAULT_TEXT_STYLE.fontWeight);
    const fontStyle = resolvedStyle.fontStyle ?? DEFAULT_TEXT_STYLE.fontStyle;
    const color = resolveAppearanceColor(
        appearance,
        resolvedStyle.colorToken,
        resolvedStyle.color ?? DEFAULT_TEXT_STYLE.color
    );
    const { fontIdEn, fontIdZh } = resolveFontIds(resolvedStyle);

    return {
        ...resolvedStyle,
        fontSize,
        lineHeight: fontSize * lineHeightScale,
        letterSpacing: fontSize * letterSpacingScale,
        fontWeight,
        fontStyle,
        color,
        font: buildCanvasFont({
            fontSize,
            fontWeight,
            fontStyle,
            fontIdEn,
            fontIdZh,
        }),
    };
}

export function measureTextItem(ctx, item, style, context = {}, parentAlign = 'start') {
    const renderedStyle = resolveRenderedTextStyle(style, context);
    const rawLines = String(item.resolvedContent ?? '').split(/\r\n|\r|\n/);
    const lines = rawLines.length > 0 ? rawLines : [''];

    ctx.save();
    ctx.font = renderedStyle.font;

    const measuredLines = lines.map((line) => {
        const metrics = ctx.measureText(line || ' ');
        const width = measureLineWidth(ctx, line, renderedStyle.letterSpacing);
        const ascent = metrics.actualBoundingBoxAscent || renderedStyle.fontSize * 0.78;
        const descent = metrics.actualBoundingBoxDescent || renderedStyle.fontSize * 0.22;

        return {
            text: line,
            width,
            ascent,
            descent,
            baselineOffset: (renderedStyle.lineHeight - renderedStyle.fontSize) / 2 + ascent,
        };
    });

    ctx.restore();

    const width = measuredLines.reduce((maxWidth, line) => Math.max(maxWidth, line.width), 0);
    const height = renderedStyle.lineHeight * measuredLines.length;

    return {
        type: TEXT_ITEM_TYPES.text,
        id: item.id,
        label: item.label,
        width,
        height,
        style: renderedStyle,
        lines: measuredLines,
        lineAlign: item.textAlign ?? parentAlign,
    };
}

export function measureSeparatorItem(item, context = {}, parentDirection = TEXT_DIRECTIONS.vertical) {
    const baseUnit = getTextBaseUnit(context.metrics);
    const length = baseUnit * normalizePositiveNumber(item.lengthScale, 1.4);
    const thickness = baseUnit * normalizePositiveNumber(item.thicknessScale, 0.06);

    if (length <= 0 || thickness <= 0) {
        return null;
    }

    const isVerticalSeparator = parentDirection === TEXT_DIRECTIONS.horizontal;

    return {
        type: TEXT_ITEM_TYPES.separator,
        id: item.id,
        label: item.label,
        width: isVerticalSeparator ? thickness : length,
        height: isVerticalSeparator ? length : thickness,
        color: resolveAppearanceColor(context.appearance, item.colorToken, item.color),
        forceVisible: Boolean(item.forceVisible),
    };
}

export async function measureImageItem(item, style, context = {}) {
    const image = await loadTextImage(item.source);

    if (!image) {
        return null;
    }

    const naturalWidth = image.naturalWidth || image.width || 0;
    const naturalHeight = image.naturalHeight || image.height || 0;
    if (!naturalWidth || !naturalHeight) {
        return null;
    }

    const renderedStyle = resolveRenderedTextStyle(style, context);
    const height = renderedStyle.lineHeight;
    const width = height * (naturalWidth / naturalHeight);

    return {
        type: TEXT_ITEM_TYPES.image,
        id: item.id,
        label: item.label,
        width,
        height,
        image,
        style: renderedStyle,
    };
}
