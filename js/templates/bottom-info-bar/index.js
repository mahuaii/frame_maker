import { defineTemplate } from '../../core/templates/registry.js';
import { renderBottomInfoBarTemplate } from './render.js';
import { resolveBottomInfoBarTemplateData } from './resolve-data.js';
import { bottomInfoBarTemplateSchema } from './schema.js';

const bottomInfoBarTemplate = defineTemplate({
    ...bottomInfoBarTemplateSchema,
    resolveData: resolveBottomInfoBarTemplateData,
    render(ctx, args) {
        renderBottomInfoBarTemplate(ctx, args);
    },
});

export default bottomInfoBarTemplate;
