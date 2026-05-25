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

export const APPEARANCE_COLOR_CONFIGS = Object.freeze([
    { key: 'appearanceBackgroundColor', section: 'canvasBackground', token: 'color' },
    { key: 'appearanceBackgroundOverlayColor', section: 'canvasBackground', token: 'overlayColor' },
    { key: 'appearancePhotoBorderColor', group: 'frame', token: 'photoBorder' },
    { key: 'appearanceBarBackgroundColor', group: 'surface', token: 'barBackground' },
]);

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

function normalizeAppearanceColor(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    const hexMatch = trimmedValue.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const rawHex = hexMatch[1].toUpperCase();
        const expandedHex = rawHex.length === 3
            ? rawHex.split('').map((character) => character + character).join('')
            : rawHex;
        const rgbHex = expandedHex.slice(0, 6);
        const alphaHex = expandedHex.length === 8 ? expandedHex.slice(6, 8) : 'FF';

        return `#${rgbHex}${alphaHex}`;
    }

    return null;
}

export function normalizeAppearanceColorConfig(rawConfig: Record<string, unknown> = {}) {
    return APPEARANCE_COLOR_CONFIGS.reduce<Record<string, string>>((config, colorConfig) => {
        const color = normalizeAppearanceColor(rawConfig[colorConfig.key]);
        if (color) {
            config[colorConfig.key] = color;
        }

        return config;
    }, {});
}

function buildAppearanceColorOverrides(config: Record<string, unknown>) {
    const colorConfig = normalizeAppearanceColorConfig(config);

    return APPEARANCE_COLOR_CONFIGS.reduce<TemplateAppearanceTheme>((overrides, appearanceColorConfig) => {
        const color = colorConfig[appearanceColorConfig.key];
        if (!color) {
            return overrides;
        }

        if ('section' in appearanceColorConfig) {
            return {
                ...overrides,
                canvasBackground: {
                    ...(overrides.canvasBackground ?? {}),
                    [appearanceColorConfig.token]: color,
                },
            };
        }

        return {
            ...overrides,
            colors: {
                ...(overrides.colors ?? {}),
                [appearanceColorConfig.group]: {
                    ...(overrides.colors?.[appearanceColorConfig.group] ?? {}),
                    [appearanceColorConfig.token]: color,
                },
            },
        };
    }, {});
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
    const colorOverrides = buildAppearanceColorOverrides(config);
    const resolvedAppearance = (Object.keys(colorOverrides).length > 0
        ? mergeAppearanceTheme(appearance, colorOverrides)
        : appearance) as TemplateAppearanceTheme;

    return {
        key: appearanceKey,
        ...resolvedAppearance,
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
