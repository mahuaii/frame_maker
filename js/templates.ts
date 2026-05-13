import { createImportedTemplateRegistry } from './core/templates/imported-registry.ts';
import bottomInfoBarTemplate from './templates/bottom-info-bar/index.ts';
import galleryCaptionMatTemplate from './templates/gallery-caption-mat/index.ts';
import simpleMatTemplate from './templates/simple-mat/index.ts';
import storyExifTemplate from './templates/story-exif/index.ts';

const builtinTemplates = [
    galleryCaptionMatTemplate,
    simpleMatTemplate,
    bottomInfoBarTemplate,
    storyExifTemplate,
];
const importedTemplateRegistry = createImportedTemplateRegistry(builtinTemplates);

export const templates = importedTemplateRegistry.templates;

export const defaultTemplate = galleryCaptionMatTemplate;

export function getTemplates() {
    return importedTemplateRegistry.templates;
}

export function getTemplateById(id) {
    return importedTemplateRegistry.getTemplateById(id);
}

export function addImportedTemplate(template) {
    return importedTemplateRegistry.addImportedTemplate(template);
}
