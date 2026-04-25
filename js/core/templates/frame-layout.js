export const FREE_FRAME_ASPECT_RATIO = 'free';

export const FRAME_ASPECT_RATIO_OPTIONS = [
    { value: FREE_FRAME_ASPECT_RATIO, label: '自由' },
    { value: '1:1', label: '1:1' },
    { value: '5:4', label: '5:4' },
    { value: '4:3', label: '4:3' },
    { value: '3:2', label: '3:2' },
    { value: '16:9', label: '16:9' },
    { value: '4:5', label: '4:5' },
    { value: '3:4', label: '3:4' },
    { value: '2:3', label: '2:3' },
    { value: '9:16', label: '9:16' },
];

const FREE_FRAME_ASPECT_RATIO_LABELS = new Set([
    FREE_FRAME_ASPECT_RATIO,
    '自由',
]);

export function parseFrameAspectRatio(value) {
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

export function normalizeFrameAspectRatioValue(value, fallbackValue = FREE_FRAME_ASPECT_RATIO) {
    if (value === null || value === undefined) {
        return fallbackValue;
    }

    const rawValue = String(value).trim();
    if (!rawValue || FREE_FRAME_ASPECT_RATIO_LABELS.has(rawValue)) {
        return FREE_FRAME_ASPECT_RATIO;
    }

    return parseFrameAspectRatio(rawValue) ? rawValue : fallbackValue;
}

export function normalizeFrameBorderWidth(value, fallbackValue = 0) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return fallbackValue;
    }

    return Math.min(Math.max(numericValue, 0), 200);
}
