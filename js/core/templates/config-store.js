import { resolveTemplateConfig } from './registry.js';

export function loadTemplateConfig(template) {
    return resolveTemplateConfig(template);
}

export function saveTemplateConfig(template, rawConfig) {
    void template;
    void rawConfig;
}
