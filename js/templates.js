import { createTemplateRegistry } from './core/templates/registry.js';
import whiteTemplate from './templates/white.js';
import blackTemplate from './templates/black.js';

const templateRegistry = createTemplateRegistry([whiteTemplate, blackTemplate]);

export const { templates, getTemplateById } = templateRegistry;

export const defaultTemplate = whiteTemplate;
