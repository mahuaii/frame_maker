import { normalizeTemplateConfig } from './fields.js';
import { createAppearanceThemes, getAppearanceColor, resolveTemplateAppearance } from './appearance.js';

function defaultResolveTemplateData() {
    return {};
}

function defaultRenderOverlay() {
    // Templates without custom overlays rely on runtime background/photo/text placement.
}

export function defineTemplate(template) {
    if (!template?.id) {
        throw new Error('Template module requires a stable id.');
    }

    if (!template.defaultConfig || typeof template.defaultConfig !== 'object') {
        throw new Error(`Template "${template.id}" requires a defaultConfig object.`);
    }

    if (!Array.isArray(template.fields)) {
        throw new Error(`Template "${template.id}" requires a fields array.`);
    }

    if (!template.frame?.sides || typeof template.frame.sides !== 'object') {
        throw new Error(`Template "${template.id}" requires frame.sides.`);
    }

    if (!Array.isArray(template.textGroups)) {
        throw new Error(`Template "${template.id}" requires a textGroups array.`);
    }

    const resolveData = typeof template.resolveData === 'function'
        ? template.resolveData
        : defaultResolveTemplateData;
    const renderOverlay = typeof template.renderOverlay === 'function'
        ? template.renderOverlay
        : defaultRenderOverlay;

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

    return Object.freeze({
        ...template,
        resolveData,
        renderOverlay,
    });
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
