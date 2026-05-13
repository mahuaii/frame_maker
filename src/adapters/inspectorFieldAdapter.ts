import type { InspectorField, InspectorFieldOption } from '../types/inspector';
import type { FrameTemplate, TemplateField } from '../types/template';

const FRAME_SIDE_ICON_PATHS = [
    'M6.2 5v6.2c0 1.1.44 2.16 1.22 2.94s1.84 1.22 2.94 1.22h3.28c1.1 0 2.16-.44 2.94-1.22s1.22-1.84 1.22-2.94V5',
    'M7.1 19.2h9.8',
];
const FRAME_BORDER_ICON_PATHS = [
    'M8 5h8',
    'M8 19h8',
    'M5 8v8',
    'M19 8v8',
];
const FRAME_SIDE_META = {
    frameTop: { label: '上边宽度 (%)', rotation: 180 },
    frameRight: { label: '右边宽度 (%)', rotation: -90 },
    frameBottom: { label: '下边宽度 (%)', rotation: 0 },
    frameLeft: { label: '左边宽度 (%)', rotation: 90 },
};
const FIELD_META: Record<string, Partial<InspectorField>> = {
    colorScheme: { label: '主题', control: 'theme-radio' },
    frameAspectRatio: { label: '画幅', type: 'option-input', groupClassName: 'field-frame-white' },
    frameBorderWidth: {
        label: '边界宽度',
        groupClassName: 'field-frame-gray',
        inputMode: 'decimal',
    },
    showThinBorder: { label: '内边框' },
};
const OPTION_LABELS: Record<string, string> = {
    free: '自由',
    original: '原照比例',
};

function buildStrokeIconPaths(paths: string[]) {
    return paths.map((path) => ({
        d: path,
        fill: 'none',
        stroke: 'var(--fpl-icon-color, var(--color-icon))',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    }));
}

function buildOptions(template: FrameTemplate, field: TemplateField): InspectorFieldOption[] | undefined {
    return field.options?.map((option) => {
        const value = String(option.value);
        const theme = field.key === 'colorScheme' ? template.appearanceThemes?.[value] : null;

        return {
            ...option,
            label: theme?.label ?? OPTION_LABELS[value] ?? value,
            displayValue: theme?.displayValue,
            swatch: theme?.canvasBackground?.color
                ?? theme?.colors?.surface?.barBackground
                ?? theme?.barBackground?.overlayColor
                ?? theme?.colors?.text?.textPrimary,
        };
    });
}

export function buildInspectorField(template: FrameTemplate, field: TemplateField): InspectorField {
    const sideMeta = FRAME_SIDE_META[field.key as keyof typeof FRAME_SIDE_META];
    const baseField: InspectorField = {
        ...field,
        label: sideMeta?.label ?? FIELD_META[field.key]?.label ?? field.key,
        options: buildOptions(template, field),
        ...FIELD_META[field.key],
    };

    if (field.key === 'frameBorderWidth') {
        return {
            ...baseField,
            prefixIconPaths: buildStrokeIconPaths(FRAME_BORDER_ICON_PATHS),
            prefixIconViewBox: '4 4 16 16',
        };
    }

    if (sideMeta) {
        return {
            ...baseField,
            prefixIconPaths: buildStrokeIconPaths(FRAME_SIDE_ICON_PATHS),
            prefixIconViewBox: '4 4 16 16',
            prefixIconRotationCenter: '12 12',
            prefixIconRotation: sideMeta.rotation,
        };
    }

    return baseField;
}
