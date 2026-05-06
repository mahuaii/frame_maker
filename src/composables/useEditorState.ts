import { computed } from 'vue';
import { useHistory } from './useHistory';
import type { CopiedPhotoSettings, EditableState, PhotoEditState } from '../types/editor';
import type { FrameTemplate } from '../types/template';

function cloneRecord<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function createPhotoEditState(
    template: FrameTemplate,
    initialValues: Record<string, unknown>,
    exifOverrides: Record<string, string>
): PhotoEditState {
    return {
        selectedTemplateId: template.id,
        fieldValuesByTemplateId: {
            [template.id]: cloneRecord(initialValues),
        },
        exifOverrides: cloneRecord(exifOverrides),
        initialExifOverrides: cloneRecord(exifOverrides),
        selectedForExport: true,
    };
}

export function useEditorState(defaultTemplate: FrameTemplate, initialValues: Record<string, unknown>) {
    const history = useHistory<EditableState>({
        activePhotoId: null,
        photoStatesById: {},
        fallbackState: createPhotoEditState(defaultTemplate, initialValues, {}),
        copiedSettings: null,
    });

    const state = computed(() => history.present.value);
    const activePhotoState = computed(() => (
        state.value.activePhotoId
            ? state.value.photoStatesById[state.value.activePhotoId] ?? state.value.fallbackState
            : state.value.fallbackState
    ));

    function withTemplateValues(
        photoState: PhotoEditState,
        template: FrameTemplate,
        fallbackValues: Record<string, unknown>
    ) {
        return {
            ...photoState.fieldValuesByTemplateId,
            [template.id]: photoState.fieldValuesByTemplateId[template.id] ?? fallbackValues,
        };
    }

    function updatePhotoState(photoId: string | null, patcher: (photoState: PhotoEditState) => PhotoEditState) {
        if (!photoId || !state.value.photoStatesById[photoId]) {
            history.commit({
                ...state.value,
                fallbackState: patcher(state.value.fallbackState),
            });
            return;
        }

        history.commit({
            ...state.value,
            photoStatesById: {
                ...state.value.photoStatesById,
                [photoId]: patcher(state.value.photoStatesById[photoId]),
            },
        });
    }

    function addPhoto(photoId: string, exifOverrides: Record<string, string>) {
        const photoState = createPhotoEditState(defaultTemplate, initialValues, exifOverrides);
        history.replacePresent({
            ...state.value,
            activePhotoId: state.value.activePhotoId ?? photoId,
            photoStatesById: {
                ...state.value.photoStatesById,
                [photoId]: photoState,
            },
        });
    }

    function setActivePhoto(photoId: string) {
        if (!state.value.photoStatesById[photoId]) {
            return;
        }

        history.replacePresent({
            ...state.value,
            activePhotoId: photoId,
        });
    }

    function selectTemplate(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            selectedTemplateId: template.id,
            fieldValuesByTemplateId: withTemplateValues(photoState, template, fallbackValues),
        }));
    }

    function setTemplateForActivePhoto(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        selectTemplate(template, fallbackValues);
    }

    function selectImportedTemplate(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            selectedTemplateId: template.id,
            fieldValuesByTemplateId: {
                ...photoState.fieldValuesByTemplateId,
                [template.id]: fallbackValues,
            },
        }));
    }

    function updateField(templateId: string, key: string, value: unknown) {
        updatePhotoState(state.value.activePhotoId, (photoState) => {
            const currentValues = photoState.fieldValuesByTemplateId[templateId] ?? {};

            return {
                ...photoState,
                fieldValuesByTemplateId: {
                    ...photoState.fieldValuesByTemplateId,
                    [templateId]: {
                        ...currentValues,
                        [key]: value,
                    },
                },
            };
        });
    }

    function replaceFieldDraft(templateId: string, key: string, value: unknown) {
        const photoId = state.value.activePhotoId;
        const targetState = photoId
            ? state.value.photoStatesById[photoId] ?? state.value.fallbackState
            : state.value.fallbackState;
        const currentValues = targetState.fieldValuesByTemplateId[templateId] ?? {};
        const nextPhotoState = {
            ...targetState,
            fieldValuesByTemplateId: {
                ...targetState.fieldValuesByTemplateId,
                [templateId]: {
                    ...currentValues,
                    [key]: value,
                },
            },
        };

        const nextState = photoId && state.value.photoStatesById[photoId]
            ? {
                ...state.value,
                photoStatesById: {
                    ...state.value.photoStatesById,
                    [photoId]: nextPhotoState,
                },
            }
            : {
                ...state.value,
                fallbackState: nextPhotoState,
            };

        history.replacePresent(nextState);
    }

    function updateExif(key: string, value: string) {
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            exifOverrides: {
                ...photoState.exifOverrides,
                [key]: value,
            },
        }));
    }

    function resetLayoutFields(template: FrameTemplate, fieldKeys: string[], fallbackValues: Record<string, unknown>) {
        updatePhotoState(state.value.activePhotoId, (photoState) => {
            const currentValues = photoState.fieldValuesByTemplateId[template.id] ?? fallbackValues;
            const resetValues = fieldKeys.reduce<Record<string, unknown>>((values, key) => {
                if (fallbackValues[key] !== undefined) {
                    values[key] = fallbackValues[key];
                }

                return values;
            }, {});

            return {
                ...photoState,
                fieldValuesByTemplateId: {
                    ...photoState.fieldValuesByTemplateId,
                    [template.id]: {
                        ...currentValues,
                        ...resetValues,
                    },
                },
            };
        });
    }

    function resetExif() {
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            exifOverrides: {
                ...photoState.initialExifOverrides,
            },
        }));
    }

    function setPhotoExportSelection(photoId: string, selectedForExport: boolean) {
        const photoState = state.value.photoStatesById[photoId];
        if (!photoState) {
            return;
        }

        history.replacePresent({
            ...state.value,
            photoStatesById: {
                ...state.value.photoStatesById,
                [photoId]: {
                    ...photoState,
                    selectedForExport,
                },
            },
        });
    }

    function copyActivePhotoSettings() {
        const photoState = activePhotoState.value;
        const copiedSettings: CopiedPhotoSettings = {
            selectedTemplateId: photoState.selectedTemplateId,
            fieldValuesByTemplateId: cloneRecord(photoState.fieldValuesByTemplateId),
        };

        history.replacePresent({
            ...state.value,
            copiedSettings,
        });
    }

    function pasteSettingsToActivePhoto() {
        const { copiedSettings } = state.value;
        if (!copiedSettings) {
            return;
        }

        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            selectedTemplateId: copiedSettings.selectedTemplateId,
            fieldValuesByTemplateId: cloneRecord(copiedSettings.fieldValuesByTemplateId),
        }));
    }

    function applyActivePhotoSettingsToAll() {
        const sourceState = activePhotoState.value;
        const nextPhotoStates = Object.fromEntries(
            Object.entries(state.value.photoStatesById).map(([photoId, photoState]) => [
                photoId,
                {
                    ...photoState,
                    selectedTemplateId: sourceState.selectedTemplateId,
                    fieldValuesByTemplateId: cloneRecord(sourceState.fieldValuesByTemplateId),
                },
            ])
        );

        history.commit({
            ...state.value,
            photoStatesById: nextPhotoStates,
        });
    }

    return {
        ...history,
        state,
        activePhotoState,
        addPhoto,
        setActivePhoto,
        selectTemplate,
        setTemplateForActivePhoto,
        selectImportedTemplate,
        updateField,
        replaceFieldDraft,
        updateExif,
        resetLayoutFields,
        resetExif,
        setPhotoExportSelection,
        copyActivePhotoSettings,
        pasteSettingsToActivePhoto,
        applyActivePhotoSettingsToAll,
    };
}
