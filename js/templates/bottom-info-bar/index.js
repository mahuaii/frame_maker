import { defineTemplate } from '../../core/templates/registry.js';
import { bottomInfoBarTemplateSchema } from './schema.js';

const bottomInfoBarTemplate = defineTemplate({
    ...bottomInfoBarTemplateSchema,
});

export default bottomInfoBarTemplate;
