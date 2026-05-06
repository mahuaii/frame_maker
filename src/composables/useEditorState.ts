import { computed } from 'vue';
import { useHistory } from './useHistory';
import type { EditableState } from '../types/editor';
import type { FrameTemplate } from '../types/template';

export function useEditorState(defaultTemplate: FrameTemplate, initialValues: Record<string, unknown>) {
    const history = useHistory<EditableState>({
        activePhotoId: null,
        selectedTemplateId: defaultTemplate.id,
        fieldValuesByTemplateId: {
            [defaultTemplate.id]: initialValues,
        },
        exifOverrides: {},
    });

    const state = computed(() => history.present.value);

    function withTemplateValues(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        return {
            ...state.value.fieldValuesByTemplateId,
            [template.id]: state.value.fieldValuesByTemplateId[template.id] ?? fallbackValues,
        };
    }

    function setActivePhoto(photoId: string, exifOverrides: Record<string, string>) {
        history.commit({
            ...state.value,
            activePhotoId: photoId,
            exifOverrides,
        });
    }

    function selectTemplate(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        history.commit({
            ...state.value,
            selectedTemplateId: template.id,
            fieldValuesByTemplateId: withTemplateValues(template, fallbackValues),
        });
    }

    function updateField(templateId: string, key: string, value: unknown) {
        const currentValues = state.value.fieldValuesByTemplateId[templateId] ?? {};
        history.commit({
            ...state.value,
            fieldValuesByTemplateId: {
                ...state.value.fieldValuesByTemplateId,
                [templateId]: {
                    ...currentValues,
                    [key]: value,
                },
            },
        });
    }

    function replaceFieldDraft(templateId: string, key: string, value: unknown) {
        const currentValues = state.value.fieldValuesByTemplateId[templateId] ?? {};
        history.replacePresent({
            ...state.value,
            fieldValuesByTemplateId: {
                ...state.value.fieldValuesByTemplateId,
                [templateId]: {
                    ...currentValues,
                    [key]: value,
                },
            },
        });
    }

    function updateExif(key: string, value: string) {
        history.commit({
            ...state.value,
            exifOverrides: {
                ...state.value.exifOverrides,
                [key]: value,
            },
        });
    }

    return {
        ...history,
        state,
        setActivePhoto,
        selectTemplate,
        updateField,
        replaceFieldDraft,
        updateExif,
    };
}
