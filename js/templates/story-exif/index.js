import { defineTemplate } from '../../core/templates/registry.js';
import { renderStoryExifTemplate } from './render.js';
import { resolveStoryExifTemplateData } from './resolve-data.js';
import { storyExifTemplateSchema } from './schema.js';

const storyExifTemplate = defineTemplate({
    ...storyExifTemplateSchema,
    resolveData: resolveStoryExifTemplateData,
    render(ctx, args) {
        renderStoryExifTemplate(ctx, args);
    },
});

export default storyExifTemplate;
