export function buildAppearanceField(
    themes,
    {
        key = 'colorScheme',
        defaultValue,
    } = {}
) {
    const themeEntries = Object.entries(themes ?? {});
    const fallbackValue = defaultValue ?? themeEntries[0]?.[0] ?? '';

    return {
        key,
        type: 'select',
        defaultValue: fallbackValue,
        options: themeEntries.map(([value]) => ({
            value,
        })),
    };
}

function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeColorGroups(baseColors = {}, overrideColors = {}) {
    const result = {};
    const keys = new Set([
        ...Object.keys(baseColors ?? {}),
        ...Object.keys(overrideColors ?? {}),
    ]);

    keys.forEach((key) => {
        const baseValue = baseColors?.[key];
        const overrideValue = overrideColors?.[key];

        result[key] = isPlainObject(baseValue) || isPlainObject(overrideValue)
            ? {
                ...(isPlainObject(baseValue) ? baseValue : {}),
                ...(isPlainObject(overrideValue) ? overrideValue : {}),
            }
            : (overrideValue ?? baseValue);
    });

    return result;
}

function mergeAppearanceTheme(baseTheme = {}, overrideTheme = {}) {
    const hasCanvasBackground = baseTheme.canvasBackground || overrideTheme.canvasBackground;
    const hasBarBackground = baseTheme.barBackground || overrideTheme.barBackground;
    const hasColors = baseTheme.colors || overrideTheme.colors;

    return {
        ...baseTheme,
        ...overrideTheme,
        ...(hasCanvasBackground ? {
            canvasBackground: {
                ...(baseTheme.canvasBackground ?? {}),
                ...(overrideTheme.canvasBackground ?? {}),
            },
        } : {}),
        ...(hasBarBackground ? {
            barBackground: {
                ...(baseTheme.barBackground ?? {}),
                ...(overrideTheme.barBackground ?? {}),
            },
        } : {}),
        ...(hasColors ? {
            colors: mergeColorGroups(baseTheme.colors, overrideTheme.colors),
        } : {}),
    };
}

function getThemeColor(theme, token, group) {
    const colors = theme?.colors;
    if (!isPlainObject(colors)) {
        return null;
    }

    if (group) {
        return isPlainObject(colors[group]) ? colors[group][token] ?? null : null;
    }

    for (const colorGroup of Object.values(colors)) {
        if (isPlainObject(colorGroup) && colorGroup[token] !== undefined) {
            return colorGroup[token];
        }
    }

    return null;
}

export function createAppearanceThemes(sharedThemes = {}, themeOverrides = {}) {
    const result = {};
    const keys = new Set([
        ...Object.keys(sharedThemes ?? {}),
        ...Object.keys(themeOverrides ?? {}),
    ]);

    keys.forEach((key) => {
        result[key] = mergeAppearanceTheme(
            sharedThemes?.[key] ?? {},
            themeOverrides?.[key] ?? {}
        );
    });

    return result;
}

export function resolveTemplateAppearance(template, config = {}) {
    const themes = template?.appearanceThemes;
    if (!themes || typeof themes !== 'object') {
        return {};
    }

    const fieldKey = template.appearanceFieldKey ?? 'colorScheme';
    const fallbackKey = template.appearanceDefaultKey ?? Object.keys(themes)[0];
    const requestedKey = config?.[fieldKey];
    const appearanceKey = Object.hasOwn(themes, requestedKey) ? requestedKey : fallbackKey;
    const appearance = themes[appearanceKey] ?? {};

    return {
        key: appearanceKey,
        ...appearance,
    };
}

export function buildColorTokenField(appearanceThemes, activeThemeKey, {
    key = 'style.colorToken',
    defaultValue,
    group = 'text',
} = {}) {
    const theme = appearanceThemes?.[activeThemeKey]
        ?? Object.values(appearanceThemes ?? {})[0]
        ?? {};
    const colors = isPlainObject(theme.colors?.[group]) ? theme.colors[group] : {};
    const entries = Object.entries(colors);
    const defaultExists = defaultValue !== undefined && entries.some(([token]) => token === defaultValue);
    const fallbackValue = defaultExists ? defaultValue : entries[0]?.[0] ?? '';

    return {
        key,
        type: 'select',
        defaultValue: fallbackValue,
        options: entries.map(([token]) => ({
            value: token,
        })),
    };
}

export function getAppearanceColor(appearance, token, fallback = null) {
    if (!appearance || typeof appearance !== 'object') {
        return fallback;
    }

    return getThemeColor(appearance, token) ?? fallback;
}
