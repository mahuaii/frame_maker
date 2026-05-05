export function buildAppearanceField(
    themes,
    {
        key = 'colorScheme',
        label = '主题',
        defaultValue,
    } = {}
) {
    const themeEntries = Object.entries(themes ?? {});
    const fallbackValue = defaultValue ?? themeEntries[0]?.[0] ?? '';

    return {
        key,
        label,
        type: 'select',
        control: 'theme-radio',
        defaultValue: fallbackValue,
        options: themeEntries.map(([value, theme]) => ({
            value,
            label: theme.label ?? value,
            displayValue: getAppearanceOptionDisplayValue(theme),
            opacity: theme.opacity,
            swatch: theme.canvasBackground?.color
                ?? getThemeColor(theme, 'barBackground', 'surface')
                ?? theme.barBackground?.overlayColor
                ?? getThemeColor(theme, 'textPrimary', 'text')
                ?? getFirstThemeColor(theme)
                ?? '#111111',
        })),
    };
}

function isBlurSurface(surface) {
    return typeof surface?.type === 'string' && surface.type.toLowerCase().includes('blur');
}

function getAppearanceOptionDisplayValue(theme = {}) {
    if (theme.displayValue !== undefined) {
        return theme.displayValue;
    }

    if (isBlurSurface(theme.canvasBackground) || isBlurSurface(theme.barBackground)) {
        return theme.label;
    }

    return undefined;
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

function getFirstThemeColor(theme) {
    const colors = theme?.colors;
    if (!isPlainObject(colors)) {
        return null;
    }

    for (const colorGroup of Object.values(colors)) {
        if (!isPlainObject(colorGroup)) {
            continue;
        }

        const firstColor = Object.values(colorGroup)[0];
        if (firstColor) {
            return firstColor;
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
    label = '颜色',
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
        label,
        type: 'select',
        control: 'color-buttons',
        defaultValue: fallbackValue,
        options: entries.map(([token, color]) => ({
            value: token,
            label: token,
            swatch: color,
            displayValue: color?.replace(/^#/, '').toUpperCase() ?? '',
        })),
    };
}

export function getAppearanceColor(appearance, token, fallback = null) {
    if (!appearance || typeof appearance !== 'object') {
        return fallback;
    }

    return getThemeColor(appearance, token) ?? fallback;
}
