import { defineTemplate } from '../../core/templates/registry.js';
import { renderPosterTemplate } from './render.js';
import { resolvePosterTemplateData } from './resolve-data.js';
import { posterTemplateSchema } from './schema.js';

const posterTemplate = defineTemplate({
    ...posterTemplateSchema,
    resolveData: resolvePosterTemplateData,
    render(ctx, args) {
        renderPosterTemplate(ctx, args);
    },
});

export default posterTemplate;
