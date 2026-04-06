import { defineTemplate } from '../../core/templates/registry.js';
import { calculateSimpleMatMetrics, simpleMatTemplateSchema } from './schema.js';

const simpleMatTemplate = defineTemplate({
    ...simpleMatTemplateSchema,
    calculateFrameMetrics: calculateSimpleMatMetrics,
});

export default simpleMatTemplate;
