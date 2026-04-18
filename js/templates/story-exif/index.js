import { defineTemplate } from '../../core/templates/registry.js';
import { resolveStoryExifTemplateData } from './resolve-data.js';
import { storyExifTemplateSchema } from './schema.js';

const storyExifTemplate = defineTemplate({
    ...storyExifTemplateSchema,
    resolveData: resolveStoryExifTemplateData,
});

export default storyExifTemplate;
