export function buildAppearanceField(
    themes,
    {
        key = 'colorScheme',
        label = '颜色',
        defaultValue,
    } = {}
) {
    const themeEntries = Object.entries(themes ?? {});
    const fallbackValue = defaultValue ?? themeEntries[0]?.[0] ?? '';

    return {
        key,
        label,
        type: 'select',
        control: 'color-buttons',
        defaultValue: fallbackValue,
        options: themeEntries.map(([value, theme]) => ({
            value,
            label: theme.label ?? value,
            swatch: theme.canvasBackground?.color
                ?? theme.colors?.barBackground
                ?? theme.barBackground?.overlayColor
                ?? theme.colors?.textPrimary
                ?? '#111111',
        })),
    };
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
            colors: {
                ...(baseTheme.colors ?? {}),
                ...(overrideTheme.colors ?? {}),
            },
        } : {}),
    };
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

export function getAppearanceColor(appearance, token, fallback = null) {
    if (!appearance || typeof appearance !== 'object') {
        return fallback;
    }

    const colors = appearance.colors;
    if (!colors || typeof colors !== 'object') {
        return fallback;
    }

    return colors[token] ?? fallback;
}
