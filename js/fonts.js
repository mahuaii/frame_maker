const SYSTEM_SANS_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const FONT_FAMILIES = {
    enDefault: '"Angie Sans Std"',
    zhDefault: SYSTEM_SANS_STACK,
    uiDefault: SYSTEM_SANS_STACK,
};

const RUNTIME_FONTS = [
    {
        family: 'Angie Sans Std',
        source: 'url("./assets/fonts/Angie_Sans_Std.otf") format("opentype")',
    },
];

let runtimeFontsReadyPromise = null;

export function getFontFamilyStack({
    fontFamilyEn = FONT_FAMILIES.enDefault,
    fontFamilyZh = FONT_FAMILIES.zhDefault,
} = {}) {
    return [fontFamilyEn, fontFamilyZh, SYSTEM_SANS_STACK]
        .filter(Boolean)
        .join(', ');
}

export function buildCanvasFont({
    fontSize,
    fontWeight = 400,
    fontStyle = 'normal',
    fontFamilyEn,
    fontFamilyZh,
}) {
    return `${fontStyle} ${fontWeight} ${Math.max(fontSize, 1)}px ${getFontFamilyStack({
        fontFamilyEn,
        fontFamilyZh,
    })}`;
}

export function resolveScaledFontSize(baseFontSize, fontSizeRatio = 1) {
    return Math.max(baseFontSize * fontSizeRatio, 1);
}

export async function loadRuntimeFonts() {
    if (runtimeFontsReadyPromise) {
        return runtimeFontsReadyPromise;
    }

    runtimeFontsReadyPromise = (async () => {
        if (typeof window === 'undefined' || typeof FontFace === 'undefined' || !document?.fonts) {
            return;
        }

        await Promise.all(RUNTIME_FONTS.map(async (fontConfig) => {
            const fontFace = new FontFace(fontConfig.family, fontConfig.source);
            const loadedFace = await fontFace.load();
            document.fonts.add(loadedFace);
        }));

        await document.fonts.ready;
    })().catch((error) => {
        console.warn('Runtime fonts failed to load, falling back to system fonts.', error);
    });

    return runtimeFontsReadyPromise;
}
