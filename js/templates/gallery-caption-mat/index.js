import { defineTemplate } from '../../core/templates/registry.js';
import { renderGalleryCaptionMatTemplate } from './render.js';
import { resolveGalleryCaptionMatTemplateData } from './resolve-data.js';
import { calculateGalleryCaptionMatMetrics, galleryCaptionMatTemplateSchema } from './schema.js';

const galleryCaptionMatTemplate = defineTemplate({
    ...galleryCaptionMatTemplateSchema,
    calculateFrameMetrics: calculateGalleryCaptionMatMetrics,
    resolveData: resolveGalleryCaptionMatTemplateData,
    render: renderGalleryCaptionMatTemplate,
});

export default galleryCaptionMatTemplate;
