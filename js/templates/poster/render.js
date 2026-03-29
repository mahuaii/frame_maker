import { buildCanvasFont } from '../../core/fonts/index.js';

function insetArea(area, insetX, insetY) {
    return {
        x: area.x + insetX,
        y: area.y + insetY,
        width: Math.max(area.width - insetX * 2, 0),
        height: Math.max(area.height - insetY * 2, 0),
    };
}

export function renderPosterTemplate(ctx, args) {
    const { area, data, metrics, runtime } = args;
    const contentArea = insetArea(
        area,
        Math.max(runtime.scaleByShortEdge(0.02), 24),
        Math.max(area.height * 0.16, 16)
    );
    const titleText = data.title || 'Untitled';
    const subtitleText = data.subtitle || '';
    const titleFit = runtime.fitText({
        text: titleText,
        maxWidth: contentArea.width,
        maxFontSize: Math.max(metrics.scaledFontSize * data.titleScale, 24),
        minFontSize: Math.max(metrics.scaledFontSize * 0.85, 14),
        buildFont: (fontSize) => buildCanvasFont({
            fontSize,
            fontWeight: 600,
            fontIdEn: data.titleFontId,
        }),
    });

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#111111';
    ctx.textAlign = data.alignment === 'center' ? 'center' : 'left';
    ctx.font = titleFit.font;

    const titleX = data.alignment === 'center'
        ? contentArea.x + contentArea.width / 2
        : contentArea.x;
    const titleY = contentArea.y;
    ctx.fillText(titleText, titleX, titleY);

    if (subtitleText) {
        const subtitleFont = buildCanvasFont({
            fontSize: Math.max(metrics.scaledFontSize * 0.92, 12),
            fontWeight: 400,
            fontIdZh: 'systemSans',
        });
        ctx.font = subtitleFont;
        ctx.fillStyle = '#4b5563';
        ctx.fillText(
            subtitleText,
            titleX,
            titleY + titleFit.fontSize + Math.max(metrics.scaledFontSize * 0.25, 8)
        );
    }

    if (data.showAccentLine) {
        const lineWidth = Math.min(contentArea.width * 0.28, 160);
        const lineY = area.y + area.height - Math.max(area.height * 0.18, 12);
        const lineX = data.alignment === 'center'
            ? area.x + (area.width - lineWidth) / 2
            : contentArea.x;

        ctx.strokeStyle = data.accentColor;
        ctx.lineWidth = Math.max(metrics.scaledFontSize * 0.12, 2);
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX + lineWidth, lineY);
        ctx.stroke();
    }

    ctx.restore();
}
