import { defineTemplate } from '../../core/templates/registry.js';
import { renderWhiteTemplate } from './render.js';
import { resolveWhiteTemplateData } from './resolve-data.js';
import { whiteTemplateSchema } from './schema.js';

const whiteTemplate = defineTemplate({
    ...whiteTemplateSchema,
    resolveData: resolveWhiteTemplateData,
    render(ctx, args) {
        renderWhiteTemplate(ctx, {
            ...args,
            template: this,
        });
    },
});

export default whiteTemplate;
