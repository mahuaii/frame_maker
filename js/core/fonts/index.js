const SYSTEM_SANS_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function resolveFontAssetUrl(relativePath) {
    return new URL(relativePath, import.meta.url).href;
}

function inferFontFormat(assetRelativePath = '') {
    if (assetRelativePath.endsWith('.woff2')) {
        return 'woff2';
    }

    if (assetRelativePath.endsWith('.woff')) {
        return 'woff';
    }

    if (assetRelativePath.endsWith('.ttf')) {
        return 'truetype';
    }

    return 'opentype';
}

function buildFontSource(localNames = [], assetRelativePath = '') {
    const fileSource = assetRelativePath
        ? `url("${resolveFontAssetUrl(assetRelativePath)}") format("${inferFontFormat(assetRelativePath)}")`
        : '';
    const localSources = localNames.map((name) => `local("${name}")`);

    return [fileSource, ...localSources].filter(Boolean).join(', ');
}

const FONT_REGISTRY = {
    angieSansStd: {
        id: 'angieSansStd',
        label: 'Angie Sans Std',
        family: 'Angie Sans Std',
        source: buildFontSource(
            ['Angie Sans Std', 'AngieSansStd'],
            '../../../assets/fonts/Angie_Sans_Std.otf'
        ),
    },
    miSans: {
        id: 'miSans',
        label: 'MiSans',
        family: 'MiSans',
        source: buildFontSource(
            ['MiSans', 'MiSans Regular', 'MiSans-Regular', 'MiSans Normal', 'MiSans-Normal'],
            '../../../assets/fonts/MiSans-Regular.woff2'
        ),
    },
    timesNewRoman: {
        id: 'timesNewRoman',
        label: 'Times New Roman',
        family: 'Times New Roman',
        source: buildFontSource(
            ['Times New Roman', 'TimesNewRomanPSMT', 'TimesNewRoman'],
            '../../../assets/fonts/times.ttf'
        ),
    },
    systemSans: {
        id: 'systemSans',
        label: 'System Sans',
        family: SYSTEM_SANS_STACK,
        system: true,
    },
};

export const DEFAULT_FONT_IDS = {
    en: 'angieSansStd',
    zh: 'systemSans',
    ui: 'systemSans',
};

export const FONT_FAMILIES = {
    enDefault: `"${FONT_REGISTRY[DEFAULT_FONT_IDS.en].family}"`,
    zhDefault: FONT_REGISTRY[DEFAULT_FONT_IDS.zh].family,
    uiDefault: FONT_REGISTRY[DEFAULT_FONT_IDS.ui].family,
};

let runtimeFontsReadyPromise = null;
let runtimeFontPreloadStarted = false;
const loadedFontIds = new Set();

export function getFontById(fontId) {
    return FONT_REGISTRY[fontId] ?? null;
}

export function listRuntimeFonts() {
    return Object.values(FONT_REGISTRY);
}

export function getFontFieldOptions() {
    return listRuntimeFonts().map((font) => ({
        value: font.id,
        label: font.label,
    }));
}

export function resolveFontFamily(fontId, fallbackFamily = SYSTEM_SANS_STACK) {
    const font = getFontById(fontId);
    if (!font) {
        return fallbackFamily;
    }

    if (font.system) {
        return font.family;
    }

    return `"${font.family}"`;
}

export function getFontFamilyStack({
    fontIdEn = DEFAULT_FONT_IDS.en,
    fontIdZh = DEFAULT_FONT_IDS.zh,
    fontFamilyEn = FONT_FAMILIES.enDefault,
    fontFamilyZh = FONT_FAMILIES.zhDefault,
} = {}) {
    const resolvedFontIdEn = fontIdEn ?? fontIdZh ?? DEFAULT_FONT_IDS.en;
    const resolvedFontIdZh = fontIdZh ?? fontIdEn ?? DEFAULT_FONT_IDS.zh;
    const resolvedFontFamilyEn = fontFamilyEn ?? fontFamilyZh ?? FONT_FAMILIES.enDefault;
    const resolvedFontFamilyZh = fontFamilyZh ?? fontFamilyEn ?? FONT_FAMILIES.zhDefault;

    return [
        resolveFontFamily(resolvedFontIdEn, resolvedFontFamilyEn),
        resolveFontFamily(resolvedFontIdZh, resolvedFontFamilyZh),
        SYSTEM_SANS_STACK,
    ]
        .filter(Boolean)
        .join(', ');
}

export function buildCanvasFont({
    fontSize,
    fontWeight = 400,
    fontStyle = 'normal',
    fontIdEn,
    fontIdZh,
    fontFamilyEn,
    fontFamilyZh,
}) {
    return `${fontStyle} ${fontWeight} ${Math.max(fontSize, 1)}px ${getFontFamilyStack({
        fontIdEn,
        fontIdZh,
        fontFamilyEn,
        fontFamilyZh,
    })}`;
}

export function resolveScaledFontSize(baseFontSize, fontSizeRatio = 1) {
    return Math.max(baseFontSize * fontSizeRatio, 1);
}

function canLoadRuntimeFonts() {
    return typeof window !== 'undefined' && typeof FontFace !== 'undefined' && Boolean(document?.fonts);
}

function createRuntimeFontsReadyPromise() {
    runtimeFontsReadyPromise = (async () => {
        if (!canLoadRuntimeFonts()) {
            return;
        }

        const fontConfigs = Object.values(FONT_REGISTRY).filter((fontConfig) => !fontConfig.system);
        const results = await Promise.allSettled(
            fontConfigs.map((fontConfig) => ensureRuntimeFont(fontConfig.id))
        );

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn(`Runtime font "${fontConfigs[index]?.id}" failed to load, falling back.`, result.reason);
            }
        });

        await document.fonts.ready;
    })().catch((error) => {
        console.warn('Runtime fonts failed to load, falling back to system fonts.', error);
    });

    return runtimeFontsReadyPromise;
}

export function loadRuntimeFonts() {
    return runtimeFontsReadyPromise ?? createRuntimeFontsReadyPromise();
}

export function preloadRuntimeFontsInBackground() {
    if (runtimeFontPreloadStarted) {
        return runtimeFontsReadyPromise;
    }

    runtimeFontPreloadStarted = true;
    return loadRuntimeFonts();
}

export async function ensureRuntimeFont(fontId) {
    const fontConfig = FONT_REGISTRY[fontId];

    if (!fontConfig || fontConfig.system) {
        return;
    }

    if (loadedFontIds.has(fontId)) {
        return;
    }

    if (!canLoadRuntimeFonts()) {
        return;
    }

    const fontFace = new FontFace(fontConfig.family, fontConfig.source);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    loadedFontIds.add(fontId);
}
