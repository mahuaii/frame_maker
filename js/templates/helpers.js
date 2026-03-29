export function buildDefaultConfig(fields) {
    return fields.reduce((config, field) => {
        config[field.key] = field.defaultValue;
        return config;
    }, {});
}

export function pickTextFieldValues(customText = {}, keys = []) {
    return keys.reduce((values, key) => {
        values[key] = customText[key] ?? '';
        return values;
    }, {});
}
