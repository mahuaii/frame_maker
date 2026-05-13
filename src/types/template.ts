import type { TemplateRenderArgs, TemplateResolveInput } from './render';
import type { TextModel } from './text';

export type TemplatePrimitiveValue = string | number | boolean;

export type TemplateFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'color'
    | 'input'
    | 'select'
    | 'toggle'
    | 'range';

export type TemplateFieldOption = {
    value: TemplatePrimitiveValue;
};

export type TemplateFieldAppearanceVisibility = {
    showOn?: TemplatePrimitiveValue[];
    hideOn?: TemplatePrimitiveValue[];
};

export type TemplateField = {
    key: string;
    type: TemplateFieldType | string;
    control?: 'color-buttons' | string;
    parseValueKey?: string;
    normalizeValueKey?: string;
    parseValue?: (rawValue: unknown, currentValue?: unknown, field?: TemplateField) => unknown;
    normalizeValue?: (rawValue: unknown, fallbackValue?: unknown, field?: TemplateField) => unknown;
    defaultValue?: unknown;
    options?: TemplateFieldOption[];
    min?: number;
    max?: number;
    step?: number;
    hidden?: boolean;
    appearanceVisibility?: TemplateFieldAppearanceVisibility;
};

export type TemplateSurfaceType = 'solid' | 'photoBlur' | 'edgeExtendBlur';

export type TemplateSurface = {
    type?: TemplateSurfaceType | string;
    color?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    [key: string]: unknown;
};

export type TemplateAppearanceTheme = {
    label?: string;
    displayValue?: string;
    opacity?: string | number;
    canvasBackground?: TemplateSurface;
    barBackground?: TemplateSurface;
    colors?: Record<string, Record<string, string>>;
};

export type FrameSideKey = 'top' | 'right' | 'bottom' | 'left';

export type FrameSides = Record<FrameSideKey, number>;

export type FrameFontConfig = {
    basis?: 'width' | 'height' | 'shorterSide' | 'longerSide' | 'area' | string;
    size?: number;
    min?: number;
};

export type FrameMarginConfig = {
    edgeRatio?: number;
    crossRatio?: number;
    min?: number;
};

export type TemplateFrame = {
    sides: FrameSides;
    font?: FrameFontConfig;
    margin?: FrameMarginConfig;
};

export type TemplateOverlay = {
    type: 'photoBorder' | string;
    enabledConfigKey?: string;
    colorToken?: string;
    fallbackColor?: string;
    widthRatio?: number;
    shape?: 'beveled' | string;
    [key: string]: unknown;
};

export type TemplateResolveData = Record<string, unknown>;

export type FrameTemplate = {
    id: string;
    label?: string;
    fields: TemplateField[];
    defaultConfig: Record<string, unknown>;
    frame: TemplateFrame;
    backgroundColor?: string;
    textGroups?: TextModel;
    overlays?: TemplateOverlay[];
    appearanceFieldKey?: string;
    appearanceDefaultKey?: string;
    appearanceThemes?: Record<string, TemplateAppearanceTheme>;
    resolveData?: (input: TemplateResolveInput) => TemplateResolveData;
    renderOverlay?: (ctx: CanvasRenderingContext2D, args: TemplateRenderArgs) => void;
    assets?: Record<string, string>;
    importedAssets?: Record<string, string>;
};
