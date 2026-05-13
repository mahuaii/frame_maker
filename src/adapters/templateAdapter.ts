import {
    addImportedTemplate as addImportedTemplateToSharedRegistry,
    defaultTemplate,
    getTemplateById as getSharedTemplateById,
    getTemplates,
} from '../../js/templates.js';
import { resolveTemplateConfig } from '../../js/core/templates/registry.js';
import type { FrameTemplate } from '../types/template';

type GetTemplates = () => readonly FrameTemplate[];
type GetTemplateById = (id: string) => FrameTemplate | undefined;
type AddImportedTemplate = (template: FrameTemplate) => FrameTemplate;
type ResolveTemplateConfig = (
    template: FrameTemplate,
    rawConfig?: Record<string, unknown>
) => Record<string, unknown>;

const defaultTemplateContract: FrameTemplate = defaultTemplate;
const getTemplatesContract: GetTemplates = getTemplates;
const getTemplateByIdContract: GetTemplateById = getSharedTemplateById;
const addImportedTemplateContract: AddImportedTemplate = addImportedTemplateToSharedRegistry;
const resolveTemplateConfigContract: ResolveTemplateConfig = resolveTemplateConfig;

export function getDefaultTemplate(): FrameTemplate {
    return defaultTemplateContract;
}

export function getAllTemplates(): FrameTemplate[] {
    return [...getTemplatesContract()];
}

export function getTemplateById(id: string | null): FrameTemplate | null {
    return id ? getTemplateByIdContract(id) ?? null : null;
}

export function addImportedTemplate(template: FrameTemplate): FrameTemplate {
    return addImportedTemplateContract(template);
}

export function getResolvedTemplateConfig(
    template: FrameTemplate,
    rawConfig: Record<string, unknown> = {}
) {
    return resolveTemplateConfigContract(template, rawConfig);
}

export function getInitialTemplateValues(template: FrameTemplate) {
    return getResolvedTemplateConfig(template, template.defaultConfig ?? {});
}
