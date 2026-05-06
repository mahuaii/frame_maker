import {
    addImportedTemplate as addImportedTemplateToSharedRegistry,
    defaultTemplate,
    getTemplateById as getSharedTemplateById,
    getTemplates,
} from '../../js/templates.js';
import { resolveTemplateConfig } from '../../js/core/templates/registry.js';
import type { FrameTemplate } from '../types/template';

export function getDefaultTemplate(): FrameTemplate {
    return defaultTemplate;
}

export function getAllTemplates(): FrameTemplate[] {
    return getTemplates() as FrameTemplate[];
}

export function getTemplateById(id: string | null): FrameTemplate | null {
    return id ? getSharedTemplateById(id) as FrameTemplate ?? null : null;
}

export function addImportedTemplate(template: FrameTemplate): FrameTemplate {
    return addImportedTemplateToSharedRegistry(template) as FrameTemplate;
}

export function getResolvedTemplateConfig(template: FrameTemplate, rawConfig = {}) {
    return resolveTemplateConfig(template, rawConfig);
}

export function getInitialTemplateValues(template: FrameTemplate) {
    return getResolvedTemplateConfig(template, template.defaultConfig ?? {});
}
