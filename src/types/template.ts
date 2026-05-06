export type TemplateFieldOption = {
    value: string;
    label: string;
    displayValue?: string;
    swatch?: string;
};

export type TemplateField = {
    key: string;
    label: string;
    type: string;
    control?: string;
    defaultValue?: unknown;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
    step?: number;
    hidden?: boolean;
};

export type FrameTemplate = {
    id: string;
    label?: string;
    fields: TemplateField[];
    defaultConfig: Record<string, unknown>;
    textGroups?: unknown[];
    appearanceFieldKey?: string;
    appearanceDefaultKey?: string;
    appearanceThemes?: Record<string, {
        label?: string;
        displayValue?: string;
        colors?: Record<string, Record<string, string>>;
    }>;
    assets?: Record<string, string>;
    importedAssets?: Record<string, string>;
};
