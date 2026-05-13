import type { FrameTemplate, TemplateAppearanceTheme, TemplateField } from '../../../src/types/template';

type AppearanceThemeMap = Record<string, TemplateAppearanceTheme>;
type AppearanceFieldOptions = {
    key?: string;
    defaultValue?: string;
};
type ColorTokenFieldOptions = {
    key?: string;
    defaultValue?: string;
    group?: string;
};

export function buildAppearanceField(
    themes: AppearanceThemeMap,
    {
        key = 'colorScheme',
        defaultValue,
    }: AppearanceFieldOptions = {}
): TemplateField {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeColorGroups(baseColors: unknown = {}, overrideColors: unknown = {}) {
    const result: Record<string, unknown> = {};
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

function mergeAppearanceTheme(baseTheme: TemplateAppearanceTheme = {}, overrideTheme: TemplateAppearanceTheme = {}) {
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

function getThemeColor(theme: TemplateAppearanceTheme, token: string, group?: string) {
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

export function createAppearanceThemes(
    sharedThemes: AppearanceThemeMap = {},
    themeOverrides: AppearanceThemeMap = {}
): AppearanceThemeMap {
    const result: AppearanceThemeMap = {};
    const keys = new Set([
        ...Object.keys(sharedThemes ?? {}),
        ...Object.keys(themeOverrides ?? {}),
    ]);

    keys.forEach((key) => {
        result[key] = mergeAppearanceTheme(
            sharedThemes?.[key] ?? {},
            themeOverrides?.[key] ?? {}
        ) as TemplateAppearanceTheme;
    });

    return result;
}

export function resolveTemplateAppearance(
    template: Pick<FrameTemplate, 'appearanceThemes' | 'appearanceFieldKey' | 'appearanceDefaultKey'>,
    config: Record<string, unknown> = {}
): TemplateAppearanceTheme & { key?: string } {
    const themes = template?.appearanceThemes;
    if (!themes || typeof themes !== 'object') {
        return {};
    }

    const fieldKey = template.appearanceFieldKey ?? 'colorScheme';
    const fallbackKey = template.appearanceDefaultKey ?? Object.keys(themes)[0];
    const requestedKey = config?.[fieldKey];
    const appearanceKey = typeof requestedKey === 'string' && Object.hasOwn(themes, requestedKey)
        ? requestedKey
        : fallbackKey;
    const appearance = themes[appearanceKey] ?? {};

    return {
        key: appearanceKey,
        ...appearance,
    };
}

export function buildColorTokenField(appearanceThemes: AppearanceThemeMap | undefined, activeThemeKey: string, {
    key = 'style.colorToken',
    defaultValue,
    group = 'text',
}: ColorTokenFieldOptions = {}): TemplateField {
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

export function getAppearanceColor(appearance: unknown, token: string, fallback: string | null = null) {
    if (!appearance || typeof appearance !== 'object') {
        return fallback;
    }

    return getThemeColor(appearance, token) ?? fallback;
}
