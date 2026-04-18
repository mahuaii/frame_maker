import { defineTemplate } from '../../core/templates/registry.js';
import { renderSimpleMatTemplate } from './render.js';
import { simpleMatTemplateSchema } from './schema.js';

const simpleMatTemplate = defineTemplate({
    ...simpleMatTemplateSchema,
    renderOverlay: renderSimpleMatTemplate,
});

export default simpleMatTemplate;
