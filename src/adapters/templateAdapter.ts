import { defaultTemplate, templates } from '../../js/templates.js';
import { createImportedTemplateRegistry } from '../../js/core/templates/imported-registry.js';
import { resolveTemplateConfig } from '../../js/core/templates/registry.js';
import type { FrameTemplate } from '../types/template';

const registry = createImportedTemplateRegistry([...templates]);

export function getDefaultTemplate(): FrameTemplate {
    return defaultTemplate;
}

export function getAllTemplates(): FrameTemplate[] {
    return registry.templates as FrameTemplate[];
}

export function getTemplateById(id: string | null): FrameTemplate | null {
    return id ? registry.getTemplateById(id) as FrameTemplate ?? null : null;
}

export function addImportedTemplate(template: FrameTemplate): FrameTemplate {
    return registry.addImportedTemplate(template) as FrameTemplate;
}

export function getResolvedTemplateConfig(template: FrameTemplate, rawConfig = {}) {
    return resolveTemplateConfig(template, rawConfig);
}

export function getInitialTemplateValues(template: FrameTemplate) {
    return getResolvedTemplateConfig(template, template.defaultConfig ?? {});
}
