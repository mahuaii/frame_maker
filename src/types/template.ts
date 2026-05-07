export type TemplateFieldOption = {
    value: string | number | boolean;
    label: string;
    displayValue?: string;
    swatch?: string;
    opacity?: string | number;
};

export type TemplateFieldIconPath = string | {
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    clipRule?: string;
};

export type TemplateField = {
    key: string;
    label: string;
    type: string;
    control?: string;
    controlClassName?: string;
    groupClassName?: string;
    valueClassName?: string;
    valueUnit?: string;
    valueInput?: boolean;
    inputType?: string;
    inputMode?: string;
    placeholder?: string;
    rows?: number;
    formatValue?: (value: unknown) => string;
    parseValue?: (value: unknown, currentValue?: unknown) => unknown;
    parseValueKey?: string;
    normalizeValueKey?: string;
    dropdownLabel?: string;
    prefixIconPaths?: TemplateFieldIconPath[];
    prefixIconViewBox?: string;
    prefixIconRotation?: number;
    prefixIconRotationCenter?: string;
    dragHandlePaths?: TemplateFieldIconPath[];
    dragHandleViewBox?: string;
    dragHandleRotation?: number;
    dragHandleRotationCenter?: string;
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
