import { normalizeTemplateConfig } from './fields.js';

function getStorageKey(templateId) {
    return `template:${templateId}:config`;
}

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadTemplateConfig(template) {
    if (!canUseLocalStorage()) {
        return { ...template.defaultConfig };
    }

    try {
        const rawValue = window.localStorage.getItem(getStorageKey(template.id));
        if (!rawValue) {
            return { ...template.defaultConfig };
        }

        const parsedValue = JSON.parse(rawValue);
        return normalizeTemplateConfig(template.fields, {
            ...template.defaultConfig,
            ...parsedValue,
        });
    } catch (error) {
        console.warn(`Failed to load config for template "${template.id}".`, error);
        return { ...template.defaultConfig };
    }
}

export function saveTemplateConfig(template, rawConfig) {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        const normalizedConfig = normalizeTemplateConfig(template.fields, {
            ...template.defaultConfig,
            ...rawConfig,
        });

        window.localStorage.setItem(
            getStorageKey(template.id),
            JSON.stringify(normalizedConfig)
        );
    } catch (error) {
        console.warn(`Failed to save config for template "${template.id}".`, error);
    }
}
