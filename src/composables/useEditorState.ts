import { computed, ref } from 'vue';
import { useHistory } from './useHistory';
import {
    cloneEditorTextModel,
    cloneJson,
    collectTextModelRecordObjectUrls,
    createTemplateTextModel,
    createTextColorPaletteItem,
    ensureSelectedTextObjectId,
    findTextObjectById,
    moveTextObjectById,
    normalizeColorValue,
    normalizeTextImageSource,
    setTextObjectFieldValue,
    setTextObjectFontId,
} from '../utils/textModelEditor';
import {
    createDefaultTextGroup,
    createDefaultTextItem,
} from '../../js/core/text/index.ts';
import { resolveTemplateConfig } from '../../js/core/templates/registry.ts';
import type { CopiedPhotoSettings, EditableState, PhotoEditState } from '../types/editor';
import type { FrameTemplate } from '../types/template';
import type {
    TextColorPaletteItem,
    TextImageSource,
    TextItemType,
    TextModel,
    TextObjectDropPosition,
} from '../types/text';

function createPhotoEditState(
    template: FrameTemplate,
    initialValues: Record<string, unknown>,
    exifOverrides: Record<string, string>
): PhotoEditState {
    return {
        selectedTemplateId: template.id,
        fieldValuesByTemplateId: {
            [template.id]: cloneJson(initialValues),
        },
        textModelsByTemplateId: {
            [template.id]: createTemplateTextModel(template),
        },
        textColorPalettesByTemplateId: {
            [template.id]: [],
        },
        exifOverrides: cloneJson(exifOverrides),
        initialExifOverrides: cloneJson(exifOverrides),
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
    const selectedTextObjectId = ref<string | null>(null);
    const textObjectUrlRegistry = new Set<string>();
    let draftBaseline: EditableState | null = null;

    const state = computed(() => history.present.value);
    const activePhotoState = computed(() => (
        getPhotoState(state.value, state.value.activePhotoId)
    ));

    function getPhotoState(editableState: EditableState, photoId: string | null) {
        return photoId && editableState.photoStatesById[photoId]
            ? editableState.photoStatesById[photoId]
            : editableState.fallbackState;
    }

    function withPhotoState(
        editableState: EditableState,
        photoId: string | null,
        photoState: PhotoEditState
    ): EditableState {
        if (photoId && editableState.photoStatesById[photoId]) {
            return {
                ...editableState,
                photoStatesById: {
                    ...editableState.photoStatesById,
                    [photoId]: photoState,
                },
            };
        }

        return {
            ...editableState,
            fallbackState: photoState,
        };
    }

    function collectReferencedTextObjectUrls() {
        const urls = new Set<string>();
        const visitPhotoState = (photoState?: PhotoEditState | null) => {
            if (!photoState) {
                return;
            }

            collectTextModelRecordObjectUrls(photoState.textModelsByTemplateId).forEach((url) => urls.add(url));
        };
        const visitEditableState = (editableState?: EditableState | null) => {
            if (!editableState) {
                return;
            }

            visitPhotoState(editableState.fallbackState);
            Object.values(editableState.photoStatesById).forEach(visitPhotoState);
            if (editableState.copiedSettings) {
                collectTextModelRecordObjectUrls(editableState.copiedSettings.textModelsByTemplateId)
                    .forEach((url) => urls.add(url));
            }
        };

        visitEditableState(history.present.value);
        history.past.value.forEach(visitEditableState);
        history.future.value.forEach(visitEditableState);

        return urls;
    }

    function releaseObjectUrl(objectUrl: string) {
        URL.revokeObjectURL(objectUrl);
        textObjectUrlRegistry.delete(objectUrl);
    }

    function releaseUnusedTextObjectUrls() {
        const referencedUrls = collectReferencedTextObjectUrls();

        Array.from(textObjectUrlRegistry).forEach((objectUrl) => {
            if (!referencedUrls.has(objectUrl)) {
                releaseObjectUrl(objectUrl);
            }
        });
    }

    function releaseAllTextObjectUrls() {
        Array.from(textObjectUrlRegistry).forEach(releaseObjectUrl);
    }

    function registerTextObjectUrl(objectUrl: string | null | undefined) {
        if (objectUrl) {
            textObjectUrlRegistry.add(objectUrl);
        }
    }

    function commitState(nextState: EditableState) {
        if (draftBaseline) {
            history.commitFrom(draftBaseline, nextState);
            draftBaseline = null;
        } else {
            history.commit(nextState);
        }
        releaseUnusedTextObjectUrls();
    }

    function replacePresentShallow(nextState: EditableState) {
        draftBaseline = null;
        history.replacePresentShallow(nextState);
        releaseUnusedTextObjectUrls();
    }

    function withTemplateValues(
        photoState: PhotoEditState,
        template: FrameTemplate,
        fallbackValues: Record<string, unknown>
    ) {
        return {
            ...photoState.fieldValuesByTemplateId,
            [template.id]: photoState.fieldValuesByTemplateId[template.id] ?? cloneJson(fallbackValues),
        };
    }

    function getInitialTemplateTextModel(template: FrameTemplate) {
        return createTemplateTextModel(template);
    }

    function getTextModelFromState(photoState: PhotoEditState, template: FrameTemplate) {
        return photoState.textModelsByTemplateId[template.id] ?? getInitialTemplateTextModel(template);
    }

    function getTextColorPaletteFromState(photoState: PhotoEditState, template: FrameTemplate) {
        return photoState.textColorPalettesByTemplateId[template.id] ?? [];
    }

    function withTemplateTextModel(photoState: PhotoEditState, template: FrameTemplate) {
        return {
            ...photoState.textModelsByTemplateId,
            [template.id]: photoState.textModelsByTemplateId[template.id] ?? getInitialTemplateTextModel(template),
        };
    }

    function withTemplateTextColorPalette(photoState: PhotoEditState, template: FrameTemplate) {
        return {
            ...photoState.textColorPalettesByTemplateId,
            [template.id]: photoState.textColorPalettesByTemplateId[template.id] ?? [],
        };
    }

    function updatePhotoState(photoId: string | null, patcher: (photoState: PhotoEditState) => PhotoEditState) {
        commitState(withPhotoState(
            state.value,
            photoId,
            patcher(getPhotoState(state.value, photoId))
        ));
    }

    function commitActiveTemplateTextState(
        template: FrameTemplate,
        mutator: (textModel: TextModel, palette: TextColorPaletteItem[]) => false | void,
        { nextSelectedId }: { nextSelectedId?: string | null } = {}
    ) {
        const photoId = state.value.activePhotoId;
        const targetState = getPhotoState(state.value, photoId);
        const textModel = cloneEditorTextModel(getTextModelFromState(targetState, template));
        const palette = cloneJson(getTextColorPaletteFromState(targetState, template));
        const result = mutator(textModel, palette);

        if (result === false) {
            return false;
        }

        const nextPhotoState: PhotoEditState = {
            ...targetState,
            textModelsByTemplateId: {
                ...targetState.textModelsByTemplateId,
                [template.id]: cloneEditorTextModel(textModel),
            },
            textColorPalettesByTemplateId: {
                ...targetState.textColorPalettesByTemplateId,
                [template.id]: palette,
            },
        };

        commitState(withPhotoState(state.value, photoId, nextPhotoState));
        selectedTextObjectId.value = ensureSelectedTextObjectId(
            textModel,
            nextSelectedId !== undefined ? nextSelectedId : selectedTextObjectId.value
        );
        return true;
    }

    function addPhoto(photoId: string, exifOverrides: Record<string, string>) {
        const photoState = createPhotoEditState(defaultTemplate, initialValues, exifOverrides);
        replacePresentShallow({
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

        if (state.value.activePhotoId === photoId) {
            return;
        }

        selectedTextObjectId.value = null;
        replacePresentShallow({
            ...state.value,
            activePhotoId: photoId,
        });
    }

    function selectTemplate(template: FrameTemplate, fallbackValues: Record<string, unknown>) {
        selectedTextObjectId.value = null;
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            selectedTemplateId: template.id,
            fieldValuesByTemplateId: withTemplateValues(photoState, template, fallbackValues),
            textModelsByTemplateId: withTemplateTextModel(photoState, template),
            textColorPalettesByTemplateId: withTemplateTextColorPalette(photoState, template),
        }));
    }

    function resolveFieldValues(templateOrId: FrameTemplate | string, currentValues: Record<string, unknown>, key: string, value: unknown) {
        const nextValues = {
            ...currentValues,
            [key]: value,
        };

        return typeof templateOrId === 'string'
            ? nextValues
            : resolveTemplateConfig(templateOrId, nextValues);
    }

    function updateField(templateOrId: FrameTemplate | string, key: string, value: unknown) {
        const templateId = typeof templateOrId === 'string' ? templateOrId : templateOrId.id;

        updatePhotoState(state.value.activePhotoId, (photoState) => {
            const currentValues = photoState.fieldValuesByTemplateId[templateId] ?? {};

            return {
                ...photoState,
                fieldValuesByTemplateId: {
                    ...photoState.fieldValuesByTemplateId,
                    [templateId]: resolveFieldValues(templateOrId, currentValues, key, value),
                },
            };
        });
    }

    function replaceFieldDraft(templateOrId: FrameTemplate | string, key: string, value: unknown) {
        if (!draftBaseline) {
            draftBaseline = cloneJson(state.value);
        }

        const templateId = typeof templateOrId === 'string' ? templateOrId : templateOrId.id;
        const photoId = state.value.activePhotoId;
        const targetState = getPhotoState(state.value, photoId);
        const currentValues = targetState.fieldValuesByTemplateId[templateId] ?? {};
        const nextPhotoState = {
            ...targetState,
            fieldValuesByTemplateId: {
                ...targetState.fieldValuesByTemplateId,
                [templateId]: resolveFieldValues(templateOrId, currentValues, key, value),
            },
        };

        history.replacePresent(withPhotoState(state.value, photoId, nextPhotoState));
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

        if (photoState.selectedForExport === selectedForExport) {
            return;
        }

        history.mutatePresent((draft) => {
            draft.photoStatesById[photoId].selectedForExport = selectedForExport;
        });
    }

    function copyActivePhotoSettings() {
        const photoState = activePhotoState.value;
        const copiedSettings: CopiedPhotoSettings = {
            selectedTemplateId: photoState.selectedTemplateId,
            fieldValuesByTemplateId: cloneJson(photoState.fieldValuesByTemplateId),
            textModelsByTemplateId: cloneJson(photoState.textModelsByTemplateId),
            textColorPalettesByTemplateId: cloneJson(photoState.textColorPalettesByTemplateId),
        };

        history.mutatePresent((draft) => {
            draft.copiedSettings = copiedSettings;
        });
    }

    function pasteSettingsToActivePhoto() {
        const { copiedSettings } = state.value;
        if (!copiedSettings) {
            return;
        }

        selectedTextObjectId.value = null;
        updatePhotoState(state.value.activePhotoId, (photoState) => ({
            ...photoState,
            selectedTemplateId: copiedSettings.selectedTemplateId,
            fieldValuesByTemplateId: cloneJson(copiedSettings.fieldValuesByTemplateId),
            textModelsByTemplateId: cloneJson(copiedSettings.textModelsByTemplateId),
            textColorPalettesByTemplateId: cloneJson(copiedSettings.textColorPalettesByTemplateId),
        }));
    }

    function applyActivePhotoSettingsToAll() {
        const sourceState = activePhotoState.value;
        selectedTextObjectId.value = null;
        const nextPhotoStates = Object.fromEntries(
            Object.entries(state.value.photoStatesById).map(([photoId, photoState]) => [
                photoId,
                {
                    ...photoState,
                    selectedTemplateId: sourceState.selectedTemplateId,
                    fieldValuesByTemplateId: cloneJson(sourceState.fieldValuesByTemplateId),
                    textModelsByTemplateId: cloneJson(sourceState.textModelsByTemplateId),
                    textColorPalettesByTemplateId: cloneJson(sourceState.textColorPalettesByTemplateId),
                },
            ])
        );

        commitState({
            ...state.value,
            photoStatesById: nextPhotoStates,
        });
    }

    function getTextModel(template: FrameTemplate) {
        return getTextModelFromState(activePhotoState.value, template);
    }

    function getTextColorPalette(template: FrameTemplate) {
        return getTextColorPaletteFromState(activePhotoState.value, template);
    }

    function setSelectedTextObject(objectId: string | null) {
        selectedTextObjectId.value = objectId;
    }

    function resetTextModel(template: FrameTemplate) {
        const textModel = getInitialTemplateTextModel(template);
        commitActiveTemplateTextState(template, (nextTextModel, palette) => {
            nextTextModel.splice(0, nextTextModel.length, ...textModel);
            palette.splice(0, palette.length);
        }, {
            nextSelectedId: textModel[0]?.id ?? null,
        });
    }

    function addRootTextGroup(template: FrameTemplate) {
        const group = createDefaultTextGroup();
        commitActiveTemplateTextState(template, (textModel) => {
            textModel.push(group);
        }, {
            nextSelectedId: group.id,
        });
    }

    function addTextObject(template: FrameTemplate, groupId: string, type: TextItemType) {
        let addedId: string | null = null;
        const committed = commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, groupId);
            if (!current || current.item.type !== 'group') {
                return false;
            }

            const item = (createDefaultTextItem as (itemType: TextItemType) => any)(type);
            current.item.items = Array.isArray(current.item.items) ? current.item.items : [];
            current.item.items.push(item);
            addedId = item.id;
        });

        if (committed && addedId) {
            selectedTextObjectId.value = addedId;
        }
    }

    function toggleTextObjectVisibility(template: FrameTemplate, objectId: string) {
        commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            current.item.visible = current.item.visible === false;
        });
    }

    function deleteTextObject(template: FrameTemplate, objectId: string) {
        let nextSelectedId: string | null | undefined;
        const selectedId = selectedTextObjectId.value;
        const committed = commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            const shouldReplaceSelection = selectedId === objectId
                || Boolean(selectedId && current.item.type === 'group'
                    && current.item.items?.some((child) => findTextObjectById([child], selectedId)));

            current.siblings.splice(current.index, 1);

            if (shouldReplaceSelection) {
                nextSelectedId = current.siblings[Math.min(current.index, current.siblings.length - 1)]?.id
                    ?? current.parent?.id
                    ?? null;
            }
        });

        if (committed && nextSelectedId !== undefined) {
            selectedTextObjectId.value = nextSelectedId;
        }
    }

    function moveTextObject(
        template: FrameTemplate,
        sourceId: string,
        targetId: string,
        position: TextObjectDropPosition
    ) {
        commitActiveTemplateTextState(template, (textModel) => (
            moveTextObjectById(textModel, sourceId, targetId, position) ? undefined : false
        ), {
            nextSelectedId: sourceId,
        });
    }

    function updateTextObjectField(template: FrameTemplate, objectId: string, fieldKey: string, nextValue: unknown) {
        commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            if (fieldKey === 'style.fontId') {
                setTextObjectFontId(current.item, String(nextValue));
                return;
            }

            setTextObjectFieldValue(current.item, fieldKey, nextValue);
        }, {
            nextSelectedId: objectId,
        });
    }

    function replaceTextImageSource(
        template: FrameTemplate,
        objectId: string,
        source: TextImageSource | null
    ) {
        const normalizedSource = normalizeTextImageSource(source);
        if (normalizedSource?.type === 'objectUrl') {
            registerTextObjectUrl(normalizedSource.src);
        }

        const committed = commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current || current.item.type !== 'image') {
                return false;
            }

            current.item.source = normalizedSource;
        }, {
            nextSelectedId: objectId,
        });

        if (!committed && normalizedSource?.type === 'objectUrl') {
            releaseObjectUrl(normalizedSource.src);
        }
    }

    function replaceTextImageFile(template: FrameTemplate, objectId: string, file: File) {
        const objectUrl = URL.createObjectURL(file);
        replaceTextImageSource(template, objectId, {
            type: 'objectUrl',
            src: objectUrl,
            name: file.name,
        });
    }

    function clearTextImageSource(template: FrameTemplate, objectId: string) {
        replaceTextImageSource(template, objectId, null);
    }

    function selectTextColor(
        template: FrameTemplate,
        objectId: string,
        tokenFieldKey: string,
        colorFieldKey: string,
        token: string,
        color: string
    ) {
        commitActiveTemplateTextState(template, (textModel) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            setTextObjectFieldValue(current.item, tokenFieldKey, token);
            setTextObjectFieldValue(current.item, colorFieldKey, normalizeColorValue(color));
        }, {
            nextSelectedId: objectId,
        });
    }

    function addTextColor(
        template: FrameTemplate,
        objectId: string,
        tokenFieldKey: string,
        colorFieldKey: string,
        color: string
    ) {
        const item = createTextColorPaletteItem(color);
        commitActiveTemplateTextState(template, (textModel, palette) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            palette.push(item);
            setTextObjectFieldValue(current.item, tokenFieldKey, '');
            setTextObjectFieldValue(current.item, colorFieldKey, normalizeColorValue(item.value));
        }, {
            nextSelectedId: objectId,
        });
    }

    function updateTextColor(
        template: FrameTemplate,
        objectId: string,
        paletteId: string,
        tokenFieldKey: string,
        colorFieldKey: string,
        color: string
    ) {
        const nextColor = normalizeColorValue(color);
        commitActiveTemplateTextState(template, (textModel, palette) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            const paletteItem = palette.find((item) => item.id === paletteId);
            if (!paletteItem) {
                return false;
            }

            paletteItem.value = nextColor;
            setTextObjectFieldValue(current.item, tokenFieldKey, '');
            setTextObjectFieldValue(current.item, colorFieldKey, nextColor);
        }, {
            nextSelectedId: objectId,
        });
    }

    function removeTextColor(
        template: FrameTemplate,
        objectId: string,
        paletteId: string,
        tokenFieldKey: string,
        colorFieldKey: string,
        selected: boolean,
        defaultToken: string,
        defaultColor: string
    ) {
        commitActiveTemplateTextState(template, (textModel, palette) => {
            const current = findTextObjectById(textModel, objectId);
            if (!current) {
                return false;
            }

            const index = palette.findIndex((item) => item.id === paletteId);
            if (index < 0) {
                return false;
            }

            palette.splice(index, 1);
            if (selected) {
                setTextObjectFieldValue(current.item, tokenFieldKey, defaultToken);
                setTextObjectFieldValue(current.item, colorFieldKey, normalizeColorValue(defaultColor));
            }
        }, {
            nextSelectedId: objectId,
        });
    }

    function undo() {
        draftBaseline = null;
        history.undo();
        selectedTextObjectId.value = null;
    }

    function redo() {
        draftBaseline = null;
        history.redo();
        selectedTextObjectId.value = null;
    }

    return {
        ...history,
        state,
        activePhotoState,
        selectedTextObjectId,
        addPhoto,
        setActivePhoto,
        selectTemplate,
        updateField,
        replaceFieldDraft,
        updateExif,
        resetLayoutFields,
        resetExif,
        setPhotoExportSelection,
        copyActivePhotoSettings,
        pasteSettingsToActivePhoto,
        applyActivePhotoSettingsToAll,
        getInitialTemplateTextModel,
        getTextModel,
        getTextModelFromState,
        getTextColorPalette,
        setSelectedTextObject,
        resetTextModel,
        addRootTextGroup,
        addTextObject,
        toggleTextObjectVisibility,
        deleteTextObject,
        moveTextObject,
        updateTextObjectField,
        replaceTextImageFile,
        clearTextImageSource,
        selectTextColor,
        addTextColor,
        updateTextColor,
        removeTextColor,
        releaseAllTextObjectUrls,
        undo,
        redo,
    };
}
