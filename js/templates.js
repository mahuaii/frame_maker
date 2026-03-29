import whiteTemplate from './templates/white.js';
import blackTemplate from './templates/black.js';

export const templates = [whiteTemplate, blackTemplate];

export function getTemplateById(id) {
    return templates.find((template) => template.id === id);
}

export const defaultTemplate = whiteTemplate;
