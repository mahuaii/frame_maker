import { buildCanvasFont } from '../../core/fonts/index.js';
import { getAppearanceColor } from '../../core/templates/registry.js';
import { insetRect } from '../shared.js';

export function renderBottomInfoBarTemplate(ctx, args) {
    const { area, data, appearance, metrics, runtime } = args;
    const contentArea = insetRect(
        area,
        Math.max(runtime.scaleByShortEdge(0.028), 20),
        Math.max(area.height * 0.3, 10)
    );
    const cameraFont = buildCanvasFont({
        fontSize: Math.max(metrics.scaledFontSize * 0.92, 12),
        fontWeight: 700,
        fontIdEn: 'systemSans',
        fontIdZh: 'systemSans',
    });
    const metaFont = buildCanvasFont({
        fontSize: Math.max(metrics.scaledFontSize * 0.8, 11),
        fontWeight: 600,
        fontIdEn: 'systemSans',
        fontIdZh: 'systemSans',
    });
    const separatorHeight = Math.max(contentArea.height * 0.42, 10);
    const separatorGap = Math.max(runtime.scaleByShortEdge(0.014), 10);
    const itemGap = Math.max(runtime.scaleByShortEdge(0.014), 10);
    const separatorWidth = 1;
    const barBackground = getAppearanceColor(appearance, 'barBackground', '#FFFFFF');
    const textPrimary = getAppearanceColor(appearance, 'textPrimary', '#111111');
    const separatorColor = getAppearanceColor(appearance, 'separator', '#9CA3AF');

    ctx.save();
    ctx.fillStyle = barBackground;
    ctx.fillRect(area.x, area.y, area.width, area.height);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = textPrimary;

    ctx.textAlign = 'left';
    ctx.font = cameraFont;
    ctx.fillText(
        data.cameraText,
        contentArea.x,
        contentArea.y + contentArea.height / 2
    );

    ctx.font = metaFont;
    ctx.textAlign = 'left';

    const items = Array.isArray(data.metaItems) ? data.metaItems : [];
    let cursorX = contentArea.x + contentArea.width;
    const centerY = contentArea.y + contentArea.height / 2;

    for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index];
        const itemMetrics = runtime.measureText({
            text: item,
            font: metaFont,
        });
        cursorX -= itemMetrics.width;
        ctx.fillText(item, cursorX, centerY);

        if (index > 0) {
            cursorX -= itemGap;
            ctx.fillStyle = separatorColor;
            ctx.fillRect(
                cursorX - separatorWidth / 2,
                centerY - separatorHeight / 2,
                separatorWidth,
                separatorHeight
            );
            ctx.fillStyle = textPrimary;
            cursorX -= separatorGap;
        }
    }
    ctx.restore();
}
