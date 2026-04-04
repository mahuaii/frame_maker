import { defineTemplate } from '../../core/templates/registry.js';
import { renderSimpleMatTemplate } from './render.js';
import { resolveSimpleMatTemplateData } from './resolve-data.js';
import { simpleMatTemplateSchema } from './schema.js';

const simpleMatTemplate = defineTemplate({
    ...simpleMatTemplateSchema,
    resolveData: resolveSimpleMatTemplateData,
    render(ctx, args) {
        renderSimpleMatTemplate(ctx, args);
    },
});

export default simpleMatTemplate;
