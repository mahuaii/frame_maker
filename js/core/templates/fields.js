function normalizeNumberValue(value, fallbackValue) {
    if (value === '' || value === null || value === undefined) {
        return fallbackValue;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function normalizeToggleValue(value, fallbackValue = false) {
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

function normalizeSelectValue(value, field, fallbackValue) {
    const options = Array.isArray(field.options) ? field.options : [];
    const validValues = new Set(options.map((option) => option.value));

    if (validValues.has(value)) {
        return value;
    }

    return fallbackValue;
}

function matchesAppearanceVisibility(visibility, values = {}, template = null) {
    if (!visibility || typeof visibility !== 'object') {
        return true;
    }

    const appearanceFieldKey = template?.appearanceFieldKey ?? 'colorScheme';
    const currentAppearanceKey = values[appearanceFieldKey];

    if (Array.isArray(visibility.showOn)) {
        return visibility.showOn.includes(currentAppearanceKey);
    }

    if (Array.isArray(visibility.hideOn)) {
        return !visibility.hideOn.includes(currentAppearanceKey);
    }

    return true;
}

export function getFieldDefaultValue(field) {
    if (field.defaultValue !== undefined) {
        return field.defaultValue;
    }

    switch (field.type) {
        case 'number':
            return 0;
        case 'toggle':
            return false;
        case 'color':
            return '#000000';
        default:
            return '';
    }
}

export function normalizeFieldValue(field, rawValue) {
    const fallbackValue = getFieldDefaultValue(field);

    switch (field.type) {
        case 'number':
            return normalizeNumberValue(rawValue, fallbackValue);
        case 'toggle':
            return normalizeToggleValue(rawValue, fallbackValue);
        case 'select':
            return normalizeSelectValue(rawValue, field, fallbackValue);
        case 'color':
        case 'text':
        case 'textarea':
        default:
            return rawValue ?? fallbackValue;
    }
}

export function buildDefaultConfig(fields) {
    return fields.reduce((config, field) => {
        config[field.key] = getFieldDefaultValue(field);
        return config;
    }, {});
}

export function normalizeTemplateConfig(fields, rawConfig = {}) {
    return fields.reduce((config, field) => {
        config[field.key] = normalizeFieldValue(field, rawConfig[field.key]);
        return config;
    }, {});
}

export function isFieldVisible(field, values = {}, template = null) {
    if (!field?.appearanceVisibility) {
        return true;
    }

    return matchesAppearanceVisibility(field.appearanceVisibility, values, template);
}
