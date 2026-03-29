import { normalizeTemplateConfig } from './fields.js';

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
