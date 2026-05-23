import type { TemplateField } from '../../../../src/types/template';
import { normalizeFrameAspectRatioValue, normalizeFrameBorderWidth } from '../frame-layout.ts';

type FieldValueNormalizer = (
    value: unknown,
    fallbackValue: unknown,
    field: TemplateField
) => unknown;

const FIELD_VALUE_NORMALIZERS: Record<string, FieldValueNormalizer> = Object.freeze({
    frameAspectRatio: normalizeFrameAspectRatioValue,
    frameBorderWidth: normalizeFrameBorderWidth,
});

export function getFieldValueNormalizer(key: string | undefined): FieldValueNormalizer | null {
    if (!key) {
        return null;
    }

    return FIELD_VALUE_NORMALIZERS[key] ?? null;
}

export function assertKnownFieldValueCapabilities(fields: unknown = [], templateId = 'unknown') {
    if (!Array.isArray(fields)) {
        return;
    }

    fields.forEach((field) => {
        if (!field || typeof field !== 'object') {
            return;
        }

        const templateField = field as TemplateField;
        const keys = [
            ['parseValueKey', templateField.parseValueKey],
            ['normalizeValueKey', templateField.normalizeValueKey],
        ];

        keys.forEach(([property, key]) => {
            if (typeof key === 'string' && !getFieldValueNormalizer(key)) {
                throw new Error(`Template "${templateId}" references unknown field capability "${property}:${key}".`);
            }
        });
    });
}
