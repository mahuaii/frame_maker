import { resolveTemplateConfig } from './registry.ts';
import type { FrameTemplate } from '../../../src/types/template';

export function loadTemplateConfig(template: FrameTemplate) {
    return resolveTemplateConfig(template);
}
