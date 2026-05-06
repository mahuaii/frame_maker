import { computed, ref } from 'vue';
import {
    addImportedTemplate,
    getAllTemplates,
    getDefaultTemplate,
    getInitialTemplateValues,
    getTemplateById,
} from '../adapters/templateAdapter';
import type { FrameTemplate } from '../types/template';

export function useTemplateStore() {
    const refreshIndex = ref(0);
    const defaultTemplate = getDefaultTemplate();

    const templates = computed(() => {
        refreshIndex.value;
        return getAllTemplates();
    });

    function findTemplate(id: string | null) {
        return getTemplateById(id) ?? defaultTemplate;
    }

    function registerImportedTemplate(template: FrameTemplate) {
        const imported = addImportedTemplate(template);
        refreshIndex.value += 1;
        return imported;
    }

    return {
        templates,
        defaultTemplate,
        findTemplate,
        getInitialTemplateValues,
        registerImportedTemplate,
    };
}
