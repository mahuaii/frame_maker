import { computed, ref } from 'vue';
import {
    addImportedTemplate,
    defaultTemplate,
    getTemplateById,
    getTemplates,
} from '../../js/templates.ts';
import { resolveTemplateConfig } from '../../js/core/templates/registry.ts';
import type { FrameTemplate } from '../types/template';

export function useTemplateStore() {
    const refreshIndex = ref(0);

    const templates = computed(() => {
        refreshIndex.value;
        return [...getTemplates()];
    });

    function findTemplate(id: string | null) {
        return id ? getTemplateById(id) ?? defaultTemplate : defaultTemplate;
    }

    function registerImportedTemplate(template: FrameTemplate) {
        const imported = addImportedTemplate(template);
        refreshIndex.value += 1;
        return imported;
    }

    function getInitialTemplateValues(template: FrameTemplate) {
        return resolveTemplateConfig(template, template.defaultConfig ?? {});
    }

    return {
        templates,
        defaultTemplate,
        findTemplate,
        getInitialTemplateValues,
        registerImportedTemplate,
    };
}
