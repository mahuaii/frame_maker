import { defineTemplate } from '../../core/templates/registry.js';
import { renderSimpleMatTemplate } from './render.js';
import { calculateSimpleMatMetrics, simpleMatTemplateSchema } from './schema.js';

const simpleMatTemplate = defineTemplate({
    ...simpleMatTemplateSchema,
    calculateFrameMetrics: calculateSimpleMatMetrics,
    render: renderSimpleMatTemplate,
});

export default simpleMatTemplate;
