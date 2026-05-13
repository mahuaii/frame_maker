export type TemplateFieldOption = {
    value: string | number | boolean;
};

export type TemplateField = {
    key: string;
    type: string;
    parseValueKey?: string;
    normalizeValueKey?: string;
    defaultValue?: unknown;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
    step?: number;
    hidden?: boolean;
};

export type TemplateSurface = {
    type?: string;
    color?: string;
    overlayColor?: string;
};

export type TemplateAppearanceTheme = {
    label?: string;
    displayValue?: string;
    opacity?: string | number;
    canvasBackground?: TemplateSurface;
    barBackground?: TemplateSurface;
    colors?: Record<string, Record<string, string>>;
};

export type FrameTemplate = {
    id: string;
    label?: string;
    fields: TemplateField[];
    defaultConfig: Record<string, unknown>;
    textGroups?: unknown[];
    appearanceFieldKey?: string;
    appearanceDefaultKey?: string;
    appearanceThemes?: Record<string, TemplateAppearanceTheme>;
    assets?: Record<string, string>;
    importedAssets?: Record<string, string>;
};
