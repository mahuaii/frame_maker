import { buildCanvasFont, FONT_FAMILIES, resolveScaledFontSize } from './fonts.js';

function normalizeTextRun(run, defaults, metrics) {
    const {
        fontFamilyEn = defaults.fontFamilyEn ?? FONT_FAMILIES.enDefault,
        fontFamilyZh = defaults.fontFamilyZh ?? FONT_FAMILIES.zhDefault,
        fontSizeRatio = defaults.fontSizeRatio ?? 1,
        fontWeight = defaults.fontWeight ?? 400,
        fontStyle = defaults.fontStyle ?? 'normal',
        letterSpacing = defaults.letterSpacing ?? 0,
        color = defaults.color,
    } = run;

    const baseFontSize = metrics.scaledTextRunBaseFontSize ?? metrics.scaledFontSize;
    const fontSize = resolveScaledFontSize(baseFontSize, fontSizeRatio);

    return {
        text: run.text ?? '',
        color,
        letterSpacing,
        fontWeight,
        fontStyle,
        fontSizeRatio,
        fontFamilyEn,
        fontFamilyZh,
        fontSize,
        font: buildCanvasFont({
            fontSize,
            fontWeight,
            fontStyle,
            fontFamilyEn,
            fontFamilyZh,
        }),
    };
}

function measureRunWidth(ctx, run) {
    ctx.font = run.font;
    const text = run.text ?? '';

    if (!text) return 0;
    if (!run.letterSpacing) return ctx.measureText(text).width;

    let width = 0;
    for (let index = 0; index < text.length; index += 1) {
        width += ctx.measureText(text[index]).width;
        if (index < text.length - 1) {
            width += run.letterSpacing;
        }
    }

    return width;
}

function drawRun(ctx, run, x, y, fallbackColor) {
    ctx.save();
    ctx.font = run.font;
    ctx.fillStyle = run.color ?? fallbackColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const text = run.text ?? '';
    if (!run.letterSpacing) {
        ctx.fillText(text, x, y);
        ctx.restore();
        return;
    }

    let currentX = x;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        ctx.fillText(char, currentX, y);
        currentX += ctx.measureText(char).width;
        if (index < text.length - 1) {
            currentX += run.letterSpacing;
        }
    }

    ctx.restore();
}

export function renderCenteredTextRuns(ctx, area, textRuns, metrics, options = {}) {
    const defaults = options.defaults ?? {};
    const fallbackColor = options.color ?? '#000000';
    const normalizedRuns = textRuns
        .map((run) => normalizeTextRun(run, defaults, metrics))
        .filter((run) => run.text.length > 0);

    if (normalizedRuns.length === 0) return;

    const measuredRuns = normalizedRuns.map((run) => ({
        ...run,
        width: measureRunWidth(ctx, run),
    }));

    const totalWidth = measuredRuns.reduce((sum, run) => sum + run.width, 0);
    let currentX = area.x + (area.width - totalWidth) / 2;
    const centerY = area.y + area.height / 2;

    measuredRuns.forEach((run) => {
        drawRun(ctx, run, currentX, centerY, fallbackColor);
        currentX += run.width;
    });
}
