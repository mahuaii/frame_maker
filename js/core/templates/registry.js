import { normalizeTemplateConfig } from './fields.js';
import { createAppearanceThemes, getAppearanceColor, resolveTemplateAppearance } from './appearance.js';

export function defineTemplate(template) {
    if (!template?.id) {
        throw new Error('Template module requires a stable id.');
    }

    if (!template?.label) {
        throw new Error(`Template "${template.id}" requires a user-facing label.`);
    }

    if (!template.defaultConfig || typeof template.defaultConfig !== 'object') {
        throw new Error(`Template "${template.id}" requires a defaultConfig object.`);
    }

    if (!Array.isArray(template.fields)) {
        throw new Error(`Template "${template.id}" requires a fields array.`);
    }

    if (typeof template.resolveData !== 'function') {
        throw new Error(`Template "${template.id}" requires a resolveData(input) function.`);
    }

    if (typeof template.render !== 'function') {
        throw new Error(`Template "${template.id}" requires a render(ctx, args) function.`);
    }

    if (template.appearanceThemes !== undefined) {
        const themes = template.appearanceThemes;
        if (!themes || typeof themes !== 'object' || Object.keys(themes).length === 0) {
            throw new Error(`Template "${template.id}" requires a non-empty appearanceThemes object.`);
        }

        const appearanceFieldKey = template.appearanceFieldKey ?? 'colorScheme';
        const hasAppearanceField = template.fields.some((field) => field.key === appearanceFieldKey);
        if (!hasAppearanceField) {
            throw new Error(`Template "${template.id}" must define field "${appearanceFieldKey}" for appearanceThemes.`);
        }
    }

    return Object.freeze(template);
}

export function createTemplateRegistry(templateModules) {
    const templateMap = new Map();

    templateModules.forEach((template) => {
        if (templateMap.has(template.id)) {
            throw new Error(`Duplicate template id "${template.id}".`);
        }

        templateMap.set(template.id, template);
    });

    const templates = Object.freeze([...templateMap.values()]);

    return {
        templates,
        getTemplateById(id) {
            return templateMap.get(id);
        },
    };
}

export function resolveTemplateConfig(template, rawConfig = {}) {
    return normalizeTemplateConfig(template.fields, {
        ...template.defaultConfig,
        ...rawConfig,
    });
}

export { createAppearanceThemes, getAppearanceColor, resolveTemplateAppearance };
