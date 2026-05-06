import { createImportedTemplateRegistry } from './core/templates/imported-registry.js';
import bottomInfoBarTemplate from './templates/bottom-info-bar/index.js';
import galleryCaptionMatTemplate from './templates/gallery-caption-mat/index.js';
import simpleMatTemplate from './templates/simple-mat/index.js';
import storyExifTemplate from './templates/story-exif/index.js';

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
