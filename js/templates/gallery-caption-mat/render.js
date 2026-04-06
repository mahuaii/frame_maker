import { buildCanvasFont } from '../../core/fonts/index.js';
import { getAppearanceColor } from '../../core/templates/registry.js';
import { drawBeveledPhotoBorder } from '../photo-border.js';

const TITLE_FONT_RATIO = 1.05;
const SUBTITLE_FONT_RATIO = 0.6;
const TITLE_MAX_WIDTH_RATIO = 0.56;
const SUBTITLE_MAX_WIDTH_RATIO = 0.34;
const TEXT_GAP_RATIO = 0.014;
const BORDER_WIDTH_RATIO = 0.0022;

function baselineForVisualCenter(centerY, metrics) {
    return centerY + ((metrics.actualBoundingBoxAscent ?? 0) - (metrics.actualBoundingBoxDescent ?? 0)) / 2;
}

function buildTextMetrics(ctx, runtime, text, fontSize, fontId, fontWeight = 400) {
    const font = buildCanvasFont({
        fontSize,
        fontWeight,
        fontIdEn: fontId,
        fontIdZh: fontId,
    });

    return {
        font,
        fontSize,
        ...runtime.measureText({
            text,
            font,
        }),
    };
}

export function renderGalleryCaptionMatTemplate(ctx, args) {
    const { area, data, appearance, metrics, runtime, canvasSize } = args;
    const titleText = data.title || 'Untitled';
    const subtitleText = data.showSubtitle ? (data.subtitle || '') : '';
    const titleFontWeight = Number.isFinite(Number(data.titleFontWeight)) ? Number(data.titleFontWeight) : 400;
    const squareSide = canvasSize.width;
    const titleMaxFontSize = Math.max(metrics.scaledFontSize * TITLE_FONT_RATIO, 16);
    const titleMinFontSize = Math.max(titleMaxFontSize * 0.72, 12);
    const subtitleMaxFontSize = Math.max(metrics.scaledFontSize * SUBTITLE_FONT_RATIO, 9);
    const subtitleMinFontSize = Math.max(subtitleMaxFontSize * 0.82, 8);
    const titleFit = runtime.fitText({
        text: titleText,
        maxWidth: squareSide * TITLE_MAX_WIDTH_RATIO,
        maxFontSize: titleMaxFontSize,
        minFontSize: titleMinFontSize,
        buildFont: (fontSize) => buildCanvasFont({
            fontSize,
            fontWeight: titleFontWeight,
            fontIdEn: data.titleFontId,
            fontIdZh: data.titleFontId,
        }),
    });
    const titleMetrics = buildTextMetrics(
        ctx,
        runtime,
        titleText,
        titleFit.fontSize,
        data.titleFontId,
        titleFontWeight
    );
    const textPrimary = getAppearanceColor(appearance, 'title', '#1A1A1A');
    const textSecondary = getAppearanceColor(appearance, 'subtitle', textPrimary);
    const borderColor = getAppearanceColor(appearance, 'photoBorder', '#000000');
    const borderWidth = Math.max(squareSide * BORDER_WIDTH_RATIO, 1);
    const shouldDrawBorder = appearance.key === 'white' && data.showThinBorder;

    ctx.save();
    if (shouldDrawBorder) {
        drawBeveledPhotoBorder(ctx, metrics.scaledPhotoArea, borderWidth, borderColor);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = textPrimary;

    if (!subtitleText) {
        const titleCenterY = area.y + area.height / 2;
        ctx.font = titleMetrics.font;
        ctx.fillText(
            titleText,
            squareSide / 2,
            baselineForVisualCenter(titleCenterY, titleMetrics)
        );
        ctx.restore();
        return;
    }

    const subtitleFit = runtime.fitText({
        text: subtitleText,
        maxWidth: squareSide * SUBTITLE_MAX_WIDTH_RATIO,
        maxFontSize: subtitleMaxFontSize,
        minFontSize: subtitleMinFontSize,
        buildFont: (fontSize) => buildCanvasFont({
            fontSize,
            fontWeight: 400,
            fontIdEn: data.subtitleFontId,
            fontIdZh: data.subtitleFontId,
        }),
    });
    const subtitleMetrics = buildTextMetrics(
        ctx,
        runtime,
        subtitleText,
        subtitleFit.fontSize,
        data.subtitleFontId,
        400
    );
    const titleHeight = (titleMetrics.actualBoundingBoxAscent ?? titleMetrics.fontSize) + (titleMetrics.actualBoundingBoxDescent ?? 0);
    const subtitleHeight = (subtitleMetrics.actualBoundingBoxAscent ?? subtitleMetrics.fontSize) + (subtitleMetrics.actualBoundingBoxDescent ?? 0);
    const gap = squareSide * TEXT_GAP_RATIO;
    const groupHeight = titleHeight + gap + subtitleHeight;
    const groupTop = area.y + (area.height - groupHeight) / 2;
    const titleCenterY = groupTop + titleHeight / 2;
    const subtitleCenterY = groupTop + titleHeight + gap + subtitleHeight / 2;

    ctx.font = titleMetrics.font;
    ctx.fillStyle = textPrimary;
    ctx.fillText(
        titleText,
        squareSide / 2,
        baselineForVisualCenter(titleCenterY, titleMetrics)
    );

    ctx.font = subtitleMetrics.font;
    ctx.fillStyle = textSecondary;
    ctx.fillText(
        subtitleText,
        squareSide / 2,
        baselineForVisualCenter(subtitleCenterY, subtitleMetrics)
    );
    ctx.restore();
}
