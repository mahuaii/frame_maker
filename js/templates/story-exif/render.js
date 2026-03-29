import { buildCanvasFont } from '../../core/fonts/index.js';

function joinMeta(parts) {
    return parts.filter(Boolean).join('   ');
}

function insetArea(area, horizontalInset, verticalInset) {
    return {
        x: area.x + horizontalInset,
        y: area.y + verticalInset,
        width: Math.max(area.width - horizontalInset * 2, 0),
        height: Math.max(area.height - verticalInset * 2, 0),
    };
}

export function renderStoryExifTemplate(ctx, args) {
    const { area, data, metrics, runtime } = args;
    const contentArea = insetArea(
        area,
        Math.max(runtime.scaleByShortEdge(0.018), 20),
        Math.max(area.height * 0.16, 12)
    );
    const titleText = data.title || 'Untitled';
    const subtitleText = data.subtitle || '';
    const primaryMeta = data.hasExif ? joinMeta(data.metaPrimary) : data.fallbackNote;
    const secondaryMeta = data.hasExif ? joinMeta(data.metaSecondary) : '';

    const titleFit = runtime.fitText({
        text: titleText,
        maxWidth: contentArea.width * 0.58,
        maxFontSize: Math.max(metrics.scaledFontSize * 1.28, 20),
        minFontSize: Math.max(metrics.scaledFontSize * 0.9, 14),
        buildFont: (fontSize) => buildCanvasFont({
            fontSize,
            fontWeight: 600,
            fontIdEn: data.titleFontId,
        }),
    });

    const metaFontSize = Math.max(metrics.scaledFontSize * 0.88 * data.metaScale, 11);
    const metaFont = buildCanvasFont({
        fontSize: metaFontSize,
        fontWeight: 400,
        fontIdZh: data.metaFontId,
        fontIdEn: data.metaFontId,
    });

    ctx.save();
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.font = titleFit.font;
    ctx.fillText(titleText, contentArea.x, contentArea.y);

    if (subtitleText) {
        ctx.font = buildCanvasFont({
            fontSize: Math.max(metrics.scaledFontSize * 0.82, 11),
            fontWeight: 400,
            fontIdZh: 'systemSans',
        });
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(
            subtitleText,
            contentArea.x,
            contentArea.y + titleFit.fontSize + Math.max(metrics.scaledFontSize * 0.18, 6)
        );
    }

    ctx.textAlign = 'right';
    ctx.font = metaFont;
    ctx.fillStyle = data.hasExif ? '#e2e8f0' : '#94a3b8';
    ctx.fillText(primaryMeta, contentArea.x + contentArea.width, contentArea.y + 2);

    if (secondaryMeta) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
            secondaryMeta,
            contentArea.x + contentArea.width,
            contentArea.y + metaFontSize + Math.max(metrics.scaledFontSize * 0.18, 6)
        );
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(metrics.scaledFontSize * 0.08, 1);
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x + area.width, area.y);
    ctx.stroke();

    ctx.restore();
}
