import { resolveTemplateConfig } from './registry.js';

function getStorageKey(templateId) {
    return `template:${templateId}:config`;
}

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadTemplateConfig(template) {
    if (!canUseLocalStorage()) {
        return resolveTemplateConfig(template);
    }

    try {
        const rawValue = window.localStorage.getItem(getStorageKey(template.id));
        if (!rawValue) {
            return resolveTemplateConfig(template);
        }

        const parsedValue = JSON.parse(rawValue);
        return resolveTemplateConfig(template, parsedValue);
    } catch (error) {
        console.warn(`Failed to load config for template "${template.id}".`, error);
        return resolveTemplateConfig(template);
    }
}

export function saveTemplateConfig(template, rawConfig) {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        const normalizedConfig = resolveTemplateConfig(template, rawConfig);

        window.localStorage.setItem(
            getStorageKey(template.id),
            JSON.stringify(normalizedConfig)
        );
    } catch (error) {
        console.warn(`Failed to save config for template "${template.id}".`, error);
    }
}
