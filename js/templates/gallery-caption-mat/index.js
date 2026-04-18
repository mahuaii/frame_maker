import { defineTemplate } from '../../core/templates/registry.js';
import { renderGalleryCaptionMatTemplate } from './render.js';
import { galleryCaptionMatTemplateSchema } from './schema.js';

const galleryCaptionMatTemplate = defineTemplate({
    ...galleryCaptionMatTemplateSchema,
    renderOverlay: renderGalleryCaptionMatTemplate,
});

export default galleryCaptionMatTemplate;
