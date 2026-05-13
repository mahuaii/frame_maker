import { loadRuntimeFonts, ensureRuntimeFont } from '../fonts/index.ts';
import { drawSurfaceBackground } from './surface.ts';

export function scaleByShortEdge(canvasSize, ratio) {
    return Math.min(canvasSize.width, canvasSize.height) * ratio;
}

export function scaleByLongEdge(canvasSize, ratio) {
    return Math.max(canvasSize.width, canvasSize.height) * ratio;
}

export function measureText(ctx, {
    text,
    font,
    letterSpacing = 0,
}) {
    ctx.save();
    if (font) {
        ctx.font = font;
    }

    const value = text ?? '';
    let width = 0;

    if (!letterSpacing) {
        width = ctx.measureText(value).width;
    } else {
        for (let index = 0; index < value.length; index += 1) {
            width += ctx.measureText(value[index]).width;
            if (index < value.length - 1) {
                width += letterSpacing;
            }
        }
    }

    const metrics = ctx.measureText(value || ' ');
    ctx.restore();

    return {
        width,
        actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
    };
}

export function fitText(ctx, {
    text,
    maxWidth,
    maxFontSize,
    minFontSize = 1,
    buildFont,
    letterSpacing = 0,
}) {
    let fontSize = maxFontSize;

    while (fontSize > minFontSize) {
        const font = buildFont(fontSize);
        const { width } = measureText(ctx, { text, font, letterSpacing });
        if (width <= maxWidth) {
            return {
                fontSize,
                font,
                width,
            };
        }

        fontSize -= 1;
    }

    const font = buildFont(minFontSize);
    const { width } = measureText(ctx, { text, font, letterSpacing });

    return {
        fontSize: minFontSize,
        font,
        width,
    };
}

export function safeArea(canvasSize, inset = 0) {
    if (typeof inset === 'number') {
        return {
            x: inset,
            y: inset,
            width: canvasSize.width - inset * 2,
            height: canvasSize.height - inset * 2,
        };
    }

    const {
        top = 0,
        right = 0,
        bottom = 0,
        left = 0,
    } = inset;

    return {
        x: left,
        y: top,
        width: canvasSize.width - left - right,
        height: canvasSize.height - top - bottom,
    };
}

export function createRuntimeHelpers({ canvas, ctx, canvasSize }) {
    return {
        canvas,
        canvasSize,
        loadFonts: loadRuntimeFonts,
        ensureFont: ensureRuntimeFont,
        scaleByShortEdge(ratio) {
            return scaleByShortEdge(canvasSize, ratio);
        },
        scaleByLongEdge(ratio) {
            return scaleByLongEdge(canvasSize, ratio);
        },
        measureText(options) {
            return measureText(ctx, options);
        },
        fitText(options) {
            return fitText(ctx, options);
        },
        safeArea(inset) {
            return safeArea(canvasSize, inset);
        },
        drawSurface(area, surface, image) {
            return drawSurfaceBackground(ctx, image, area, surface);
        },
    };
}
