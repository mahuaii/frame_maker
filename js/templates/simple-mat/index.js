import { defineTemplate } from '../../core/templates/registry.js';
import { simpleMatTemplateSchema } from './schema.js';

const simpleMatTemplate = defineTemplate({
    ...simpleMatTemplateSchema,
});

export default simpleMatTemplate;
