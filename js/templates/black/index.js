import { defineTemplate } from '../../core/templates/registry.js';
import { renderBlackTemplate } from './render.js';
import { resolveBlackTemplateData } from './resolve-data.js';
import { blackTemplateSchema } from './schema.js';

const blackTemplate = defineTemplate({
    ...blackTemplateSchema,
    resolveData: resolveBlackTemplateData,
    render(ctx, args) {
        renderBlackTemplate(ctx, {
            ...args,
            template: this,
        });
    },
});

export default blackTemplate;
