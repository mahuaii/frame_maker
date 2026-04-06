import { createTemplateRegistry } from './core/templates/registry.js';
import bottomInfoBarTemplate from './templates/bottom-info-bar/index.js';
import galleryCaptionMatTemplate from './templates/gallery-caption-mat/index.js';
import simpleMatTemplate from './templates/simple-mat/index.js';
import storyExifTemplate from './templates/story-exif/index.js';

const templateRegistry = createTemplateRegistry([
    galleryCaptionMatTemplate,
    simpleMatTemplate,
    bottomInfoBarTemplate,
    storyExifTemplate,
]);

export const { templates, getTemplateById } = templateRegistry;

export const defaultTemplate = galleryCaptionMatTemplate;
