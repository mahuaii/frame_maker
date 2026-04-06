import { buildCanvasFont } from '../../core/fonts/index.js';
import { getAppearanceColor } from '../../core/templates/registry.js';
import { insetRect, joinMetaParts, normalizeTemplateText } from '../shared.js';

export function renderStoryExifTemplate(ctx, args) {
    const { area, config, data, appearance, metrics, runtime } = args;
    const contentArea = insetRect(
        area,
        Math.max(runtime.scaleByShortEdge(0.018), 20),
        Math.max(area.height * 0.16, 12)
    );
    const titleText = normalizeTemplateText(config.title) || 'Untitled';
    const subtitleText = config.showSubtitle ? normalizeTemplateText(config.subtitle) : '';
    const primaryMeta = data.hasExif ? joinMetaParts(data.metaPrimary, '   ') : normalizeTemplateText(config.fallbackNote, 'EXIF unavailable');
    const secondaryMeta = data.hasExif ? joinMetaParts(data.metaSecondary, '   ') : '';

    const titleFit = runtime.fitText({
        text: titleText,
        maxWidth: contentArea.width * 0.58,
        maxFontSize: Math.max(metrics.scaledFontSize * 1.28, 20),
        minFontSize: Math.max(metrics.scaledFontSize * 0.9, 14),
        buildFont: (fontSize) => buildCanvasFont({
            fontSize,
            fontWeight: 600,
            fontIdEn: config.titleFontId,
            fontIdZh: config.titleFontId,
        }),
    });

    const metaFontSize = Math.max(metrics.scaledFontSize * 0.88 * config.metaScale, 11);
    const metaFont = buildCanvasFont({
        fontSize: metaFontSize,
        fontWeight: 400,
        fontIdZh: config.metaFontId,
        fontIdEn: config.metaFontId,
    });
    const subtitleFontSize = Math.max(metrics.scaledFontSize * 0.82, 11);
    const subtitleFont = buildCanvasFont({
        fontSize: subtitleFontSize,
        fontWeight: 400,
        fontIdEn: config.titleFontId,
        fontIdZh: config.titleFontId,
    });
    const titleColor = getAppearanceColor(appearance, 'title', '#F8FAFC');
    const subtitleColor = getAppearanceColor(appearance, 'subtitle', '#CBD5E1');
    const metaPrimaryColor = getAppearanceColor(appearance, 'metaPrimary', '#E2E8F0');
    const metaSecondaryColor = getAppearanceColor(appearance, 'metaSecondary', '#94A3B8');
    const metaFallbackColor = getAppearanceColor(appearance, 'metaFallback', '#94A3B8');
    const lineGap = Math.max(metrics.scaledFontSize * 0.18, 6);
    const leftGroupHeight = titleFit.fontSize + (subtitleText ? lineGap + subtitleFontSize : 0);
    const leftGroupTop = contentArea.y + (contentArea.height - leftGroupHeight) / 2;
    const rightHasSecondaryLine = Boolean(secondaryMeta);
    const rightGroupHeight = metaFontSize + (rightHasSecondaryLine ? lineGap + metaFontSize : 0);
    const rightGroupTop = contentArea.y + (contentArea.height - rightGroupHeight) / 2;

    ctx.save();
    ctx.textBaseline = 'top';

    ctx.fillStyle = titleColor;
    ctx.textAlign = 'left';
    ctx.font = titleFit.font;
    ctx.fillText(titleText, contentArea.x, leftGroupTop);

    if (subtitleText) {
        ctx.font = subtitleFont;
        ctx.fillStyle = subtitleColor;
        ctx.fillText(
            subtitleText,
            contentArea.x,
            leftGroupTop + titleFit.fontSize + lineGap
        );
    }

    ctx.textAlign = 'right';
    ctx.font = metaFont;
    ctx.fillStyle = data.hasExif ? metaPrimaryColor : metaFallbackColor;
    ctx.fillText(primaryMeta, contentArea.x + contentArea.width, rightGroupTop);

    if (secondaryMeta) {
        ctx.fillStyle = metaSecondaryColor;
        ctx.fillText(
            secondaryMeta,
            contentArea.x + contentArea.width,
            rightGroupTop + metaFontSize + lineGap
        );
    }

    ctx.restore();
}
