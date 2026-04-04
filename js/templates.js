import { createTemplateRegistry } from './core/templates/registry.js';
import bottomInfoBarTemplate from './templates/bottom-info-bar/index.js';
import classicFrameTemplate from './templates/classic-frame/index.js';
import posterTemplate from './templates/poster/index.js';
import simpleMatTemplate from './templates/simple-mat/index.js';
import storyExifTemplate from './templates/story-exif/index.js';

const templateRegistry = createTemplateRegistry([
    classicFrameTemplate,
    bottomInfoBarTemplate,
    posterTemplate,
    simpleMatTemplate,
    storyExifTemplate,
]);

export const { templates, getTemplateById } = templateRegistry;

export const defaultTemplate = classicFrameTemplate;
