import {
    addImportedTemplate as addImportedTemplateToSharedRegistry,
    defaultTemplate,
    getTemplateById as getSharedTemplateById,
    getTemplates,
} from '../../js/templates.ts';
import { resolveTemplateConfig } from '../../js/core/templates/registry.ts';
import type { FrameTemplate } from '../types/template';

export function getDefaultTemplate(): FrameTemplate {
    return defaultTemplate;
}

export function getAllTemplates(): FrameTemplate[] {
    return [...getTemplates()];
}

export function getTemplateById(id: string | null): FrameTemplate | null {
    return id ? getSharedTemplateById(id) ?? null : null;
}

export function addImportedTemplate(template: FrameTemplate): FrameTemplate {
    return addImportedTemplateToSharedRegistry(template);
}

export function getResolvedTemplateConfig(
    template: FrameTemplate,
    rawConfig: Record<string, unknown> = {}
) {
    return resolveTemplateConfig(template, rawConfig);
}

export function getInitialTemplateValues(template: FrameTemplate) {
    return getResolvedTemplateConfig(template, template.defaultConfig ?? {});
}
