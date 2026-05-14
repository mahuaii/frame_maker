import type { TemplateFieldOption, TemplatePrimitiveValue } from '../../../src/types/template';

export const FREE_FRAME_ASPECT_RATIO = 'free';
export const ORIGINAL_FRAME_ASPECT_RATIO = 'original';
export const FRAME_SIDE_KEYS = ['top', 'right', 'bottom', 'left'] as const;
export const FRAME_SIDE_FIELD_KEYS = Object.freeze({
    top: 'frameTop',
    right: 'frameRight',
    bottom: 'frameBottom',
    left: 'frameLeft',
});
export const FRAME_ASPECT_RATIO_FIELD_KEY = 'frameAspectRatio';
export const FRAME_BORDER_WIDTH_FIELD_KEY = 'frameBorderWidth';
export const FRAME_LAYOUT_FIELD_KEYS = Object.freeze([
    FRAME_ASPECT_RATIO_FIELD_KEY,
    FRAME_BORDER_WIDTH_FIELD_KEY,
    ...Object.values(FRAME_SIDE_FIELD_KEYS),
]);

export const FRAME_ASPECT_RATIO_OPTIONS: TemplateFieldOption[] = [
    { value: FREE_FRAME_ASPECT_RATIO },
    { value: ORIGINAL_FRAME_ASPECT_RATIO },
    { value: '1:1' },
    { value: '5:4' },
    { value: '4:3' },
    { value: '3:2' },
    { value: '16:9' },
    { value: '4:5' },
    { value: '3:4' },
    { value: '2:3' },
    { value: '9:16' },
];

const FREE_FRAME_ASPECT_RATIO_LABELS = new Set<TemplatePrimitiveValue>([
    FREE_FRAME_ASPECT_RATIO,
    '自由',
]);

const ORIGINAL_FRAME_ASPECT_RATIO_LABELS = new Set<TemplatePrimitiveValue>([
    ORIGINAL_FRAME_ASPECT_RATIO,
    '原照比例',
]);

export function parseFrameAspectRatio(value: unknown): number | null {
    if (typeof value !== 'string') {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue || FREE_FRAME_ASPECT_RATIO_LABELS.has(normalizedValue)) {
        return null;
    }

    const parts = normalizedValue.split(/[:：]/).map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part) || part <= 0)) {
        return null;
    }

    return parts[0] / parts[1];
}

export function normalizeFrameAspectRatioValue(
    value: unknown,
    fallbackValue: TemplatePrimitiveValue = FREE_FRAME_ASPECT_RATIO
): TemplatePrimitiveValue {
    if (value === null || value === undefined) {
        return fallbackValue;
    }

    const rawValue = String(value).trim();
    if (!rawValue || FREE_FRAME_ASPECT_RATIO_LABELS.has(rawValue)) {
        return FREE_FRAME_ASPECT_RATIO;
    }

    if (ORIGINAL_FRAME_ASPECT_RATIO_LABELS.has(rawValue)) {
        return ORIGINAL_FRAME_ASPECT_RATIO;
    }

    return parseFrameAspectRatio(rawValue) ? rawValue : fallbackValue;
}

export function normalizeFrameBorderWidth(value: unknown, fallbackValue = 0): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return fallbackValue;
    }

    return Math.min(Math.max(numericValue, 0), 100);
}
