import { defineTemplate } from '../../core/templates/registry.js';
import { renderClassicFrameTemplate } from './render.js';
import { resolveClassicFrameTemplateData } from './resolve-data.js';
import { classicFrameTemplateSchema } from './schema.js';

const classicFrameTemplate = defineTemplate({
    ...classicFrameTemplateSchema,
    resolveData: resolveClassicFrameTemplateData,
    render: renderClassicFrameTemplate,
});

export default classicFrameTemplate;
