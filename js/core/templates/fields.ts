import type { TemplateField } from '../../../src/types/template';
import { getFieldValueNormalizer } from './capabilities/field-values.ts';

function normalizeNumberValue(value: unknown, fallbackValue: unknown): unknown {
    if (value === '' || value === null || value === undefined) {
        return fallbackValue;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function normalizeToggleValue(value: unknown, fallbackValue: unknown = false): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return Boolean(fallbackValue);
}

function normalizeSelectValue(value: unknown, field: TemplateField, fallbackValue: unknown): unknown {
    const options = Array.isArray(field.options) ? field.options : [];
    const validValues = new Set(options.map((option) => option.value));

    if (validValues.has(value as never)) {
        return value;
    }

    return fallbackValue;
}

function clampColorChannel(value: unknown): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.min(Math.max(Math.round(numericValue), 0), 255);
}

function toHexChannel(value: unknown): string {
    return clampColorChannel(value).toString(16).padStart(2, '0').toUpperCase();
}

function normalizeColorAlpha(value: unknown): number {
    if (typeof value !== 'string') {
        return 255;
    }

    const trimmedValue = value.trim();
    const parsedValue = trimmedValue.endsWith('%')
        ? Number.parseFloat(trimmedValue) / 100
        : Number.parseFloat(trimmedValue);

    if (!Number.isFinite(parsedValue)) {
        return 255;
    }

    return clampColorChannel(parsedValue * 255);
}

function normalizeColorValue(value: unknown, fallbackValue = '#000000FF'): string {
    if (typeof value !== 'string') {
        return fallbackValue;
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

    const rgbMatch = trimmedValue.match(/^rgba?\((.+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map((part) => part.trim());
        const [red, green, blue, alpha = '1'] = parts;

        if (red !== undefined && green !== undefined && blue !== undefined) {
            return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}${toHexChannel(normalizeColorAlpha(alpha))}`;
        }
    }

    return fallbackValue;
}

export function getFieldDefaultValue(field: TemplateField): unknown {
    if (field.defaultValue !== undefined) {
        if (field.type === 'color') {
            return normalizeColorValue(field.defaultValue);
        }

        return field.defaultValue;
    }

    switch (field.type) {
        case 'number':
            return 0;
        case 'toggle':
            return false;
        case 'color':
            return '#000000FF';
        default:
            return '';
    }
}

export function normalizeFieldValue(field: TemplateField, rawValue: unknown): unknown {
    const fallbackValue = getFieldDefaultValue(field);

    if (typeof field.normalizeValue === 'function') {
        return field.normalizeValue(rawValue, fallbackValue, field);
    }

    const normalizeValueCapability = getFieldValueNormalizer(field.normalizeValueKey);
    if (normalizeValueCapability) {
        return normalizeValueCapability(rawValue, fallbackValue, field);
    }

    switch (field.type) {
        case 'number':
            return normalizeNumberValue(rawValue, fallbackValue);
        case 'toggle':
            return normalizeToggleValue(rawValue, fallbackValue);
        case 'select':
            return normalizeSelectValue(rawValue, field, fallbackValue);
        case 'color':
            return normalizeColorValue(rawValue, fallbackValue as string);
        case 'text':
        case 'textarea':
        default:
            return rawValue ?? fallbackValue;
    }
}

export function parseFieldInputValue(
    field: TemplateField,
    rawValue: unknown,
    currentValue: unknown
): unknown {
    if (typeof field.parseValue === 'function') {
        return field.parseValue(rawValue, currentValue, field);
    }

    const parseValueCapability = getFieldValueNormalizer(field.parseValueKey);
    if (parseValueCapability) {
        return parseValueCapability(rawValue, currentValue, field);
    }

    return rawValue;
}

export function buildDefaultConfig(fields: TemplateField[]): Record<string, unknown> {
    return fields.reduce<Record<string, unknown>>((config, field) => {
        config[field.key] = getFieldDefaultValue(field);
        return config;
    }, {});
}

export function normalizeTemplateConfig(
    fields: TemplateField[],
    rawConfig: Record<string, unknown> = {}
): Record<string, unknown> {
    return fields.reduce<Record<string, unknown>>((config, field) => {
        config[field.key] = normalizeFieldValue(field, rawConfig[field.key]);
        return config;
    }, {});
}
