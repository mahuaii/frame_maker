import { createTemplateRegistry } from './core/templates/registry.js';
import posterTemplate from './templates/poster/index.js';
import storyExifTemplate from './templates/story-exif/index.js';
import whiteTemplate from './templates/white/index.js';
import blackTemplate from './templates/black/index.js';

const templateRegistry = createTemplateRegistry([
    whiteTemplate,
    blackTemplate,
    posterTemplate,
    storyExifTemplate,
]);

export const { templates, getTemplateById } = templateRegistry;

export const defaultTemplate = whiteTemplate;
