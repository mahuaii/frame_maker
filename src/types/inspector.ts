import type { TemplateField, TemplateFieldOption } from './template';

export type InspectorFieldOption = TemplateFieldOption & {
    label: string;
    displayValue?: string;
    swatch?: string;
    opacity?: string | number;
};

export type InspectorFieldIconPath = string | {
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    clipRule?: string;
};

export type InspectorField = Omit<TemplateField, 'options' | 'parseValue'> & {
    label: string;
    control?: string;
    controlClassName?: string;
    frameVariant?: 'white' | 'gray';
    valueClassName?: string;
    valueUnit?: string;
    valueInput?: boolean;
    inputType?: string;
    inputMode?: string;
    placeholder?: string;
    rows?: number;
    formatValue?: (value: unknown) => string;
    parseValue?: (value: unknown, currentValue?: unknown) => unknown;
    dropdownLabel?: string;
    prefixIconPaths?: InspectorFieldIconPath[];
    prefixIconViewBox?: string;
    prefixIconRotation?: number;
    prefixIconRotationCenter?: string;
    dragHandlePaths?: InspectorFieldIconPath[];
    dragHandleViewBox?: string;
    dragHandleRotation?: number;
    dragHandleRotationCenter?: string;
    options?: InspectorFieldOption[];
};
