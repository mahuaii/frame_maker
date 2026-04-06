import { defineTemplate } from '../../core/templates/registry.js';
import { renderGalleryCaptionMatTemplate } from './render.js';
import { calculateGalleryCaptionMatMetrics, galleryCaptionMatTemplateSchema } from './schema.js';

const galleryCaptionMatTemplate = defineTemplate({
    ...galleryCaptionMatTemplateSchema,
    calculateFrameMetrics: calculateGalleryCaptionMatMetrics,
    render: renderGalleryCaptionMatTemplate,
});

export default galleryCaptionMatTemplate;
