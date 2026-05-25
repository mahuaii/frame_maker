import { normalizeTemplateConfig } from './fields.ts';
import {
    buildColorTokenField,
    createAppearanceThemes,
    getAppearanceColor,
    normalizeAppearanceColorConfig,
    resolveTemplateAppearance,
} from './appearance.ts';
import type { FrameTemplate, TemplateResolveData } from '../../../src/types/template';
import type { TemplateRenderArgs } from '../../../src/types/render';

function defaultResolveTemplateData(): TemplateResolveData {
    return {};
}

function defaultRenderOverlay(_ctx: CanvasRenderingContext2D, _args: TemplateRenderArgs) {
    // Templates without custom overlays rely on runtime background/photo/text placement.
}

export function defineTemplate(template: FrameTemplate): FrameTemplate {
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

export function resolveTemplateConfig(template: FrameTemplate, rawConfig: Record<string, unknown> = {}) {
    const config = normalizeTemplateConfig(template.fields, {
        ...template.defaultConfig,
        ...rawConfig,
    });
    const appearanceColorConfig = normalizeAppearanceColorConfig(rawConfig);

    return Object.keys(appearanceColorConfig).length > 0
        ? {
            ...config,
            ...appearanceColorConfig,
        }
        : config;
}

export { buildColorTokenField, createAppearanceThemes, getAppearanceColor, resolveTemplateAppearance };
