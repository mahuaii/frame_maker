import { loadTemplateConfig } from '../core/templates/config-store.js';
import { resolveTemplateConfig } from '../core/templates/registry.js';
import { cloneTextModel, normalizeTextModel } from '../core/text/index.js';
import { DEFAULT_TEMPLATE_ID } from './constants.js';

function createPhotoEntryId() {
    return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneTemplateFieldValuesMap(sourceMap = new Map()) {
    const nextMap = new Map();

    sourceMap.forEach((values, templateId) => {
        nextMap.set(templateId, { ...(values ?? {}) });
    });

    return nextMap;
}

function cloneTextModelMap(sourceMap = new Map()) {
    const nextMap = new Map();

    sourceMap.forEach((model, templateId) => {
        nextMap.set(templateId, normalizeTextModel(cloneTextModel(model ?? [])));
    });

    return nextMap;
}

export function createAppState({ templates, getTemplateById }) {
    let currentImage = null;
    let currentPhoto = null;
    let selectedTemplateId = DEFAULT_TEMPLATE_ID;
    let fieldValues = {};
    let templateFieldValuesById = new Map();
    let exifOverrideValues = {};
    let initialExifOverrideValues = {};
    let activeInspectorPanel = 'basic';
    let selectedTextObjectId = null;
    let textModelsByTemplateId = new Map();
    const photoEntries = [];
    let activePhotoId = null;
    let copiedBatchSettings = null;
    const objectUrlRegistry = new Set();

    function getCurrentSnapshot() {
        return {
            currentImage,
            currentPhoto,
            selectedTemplateId,
            fieldValues,
            exifOverrideValues,
            initialExifOverrideValues,
            activeInspectorPanel,
            selectedTextObjectId,
            photoEntries,
            activePhotoId,
            copiedBatchSettings,
        };
    }

    function getActivePhotoEntry() {
        return photoEntries.find((entry) => entry.id === activePhotoId) ?? null;
    }

    function getTemplateFieldValues(template) {
        if (!template) {
            return {};
        }

        if (!templateFieldValuesById.has(template.id)) {
            templateFieldValuesById.set(template.id, loadTemplateConfig(template));
        }

        return resolveTemplateConfig(template, templateFieldValuesById.get(template.id));
    }

    function saveTemplateFieldValues(template, values) {
        if (!template) {
            return;
        }

        templateFieldValuesById.set(template.id, resolveTemplateConfig(template, values));
    }

    function getPhotoEntryTemplateFieldValues(entry, template) {
        if (!entry?.fieldValuesByTemplateId.has(template.id)) {
            entry.fieldValuesByTemplateId.set(template.id, loadTemplateConfig(template));
        }

        return resolveTemplateConfig(template, entry.fieldValuesByTemplateId.get(template.id));
    }

    function getTemplateTextModel(template) {
        if (!template) {
            return [];
        }

        if (!textModelsByTemplateId.has(template.id)) {
            textModelsByTemplateId.set(template.id, normalizeTextModel(cloneTextModel(template.textGroups ?? [])));
        }

        return textModelsByTemplateId.get(template.id);
    }

    function setTemplateTextModel(template, textModel) {
        if (!template) {
            return;
        }

        textModelsByTemplateId.set(template.id, normalizeTextModel(textModel));
    }

    function getPhotoEntryTextModel(entry, template) {
        if (!entry?.textModelsByTemplateId.has(template.id)) {
            entry.textModelsByTemplateId.set(
                template.id,
                normalizeTextModel(cloneTextModel(template.textGroups ?? []))
            );
        }

        return entry.textModelsByTemplateId.get(template.id);
    }

    function saveActivePhotoState() {
        const entry = getActivePhotoEntry();
        if (!entry) {
            return;
        }

        const template = getTemplateById(selectedTemplateId);
        if (template) {
            saveTemplateFieldValues(template, fieldValues);
        }

        entry.selectedTemplateId = selectedTemplateId;
        entry.fieldValuesByTemplateId = templateFieldValuesById;
        entry.textModelsByTemplateId = textModelsByTemplateId;
        entry.exifOverrideValues = { ...exifOverrideValues };
        entry.initialExifOverrideValues = { ...initialExifOverrideValues };
    }

    function activatePhotoEntry(entry) {
        if (!entry) {
            currentImage = null;
            currentPhoto = null;
            activePhotoId = null;
            return;
        }

        currentImage = entry.image;
        currentPhoto = entry.photo;
        selectedTemplateId = entry.selectedTemplateId;
        templateFieldValuesById = entry.fieldValuesByTemplateId;
        textModelsByTemplateId = entry.textModelsByTemplateId;
        exifOverrideValues = { ...entry.exifOverrideValues };
        initialExifOverrideValues = { ...entry.initialExifOverrideValues };
        activePhotoId = entry.id;

        const template = getTemplateById(selectedTemplateId);
        if (template) {
            fieldValues = getTemplateFieldValues(template);
            selectedTextObjectId = getTemplateTextModel(template)[0]?.id ?? null;
        }
    }

    function createPhotoEntry({ file, image, objectUrl, photo, exifOverrideSnapshot }) {
        const template = getTemplateById(selectedTemplateId) ?? templates[0];
        const entryFieldValuesById = new Map();
        const entryTextModelsByTemplateId = new Map();

        if (template) {
            entryFieldValuesById.set(template.id, loadTemplateConfig(template));
            entryTextModelsByTemplateId.set(
                template.id,
                normalizeTextModel(cloneTextModel(template.textGroups ?? []))
            );
        }

        return {
            id: createPhotoEntryId(),
            file,
            image,
            objectUrl,
            photo,
            selectedForExport: true,
            selectedTemplateId: template?.id ?? selectedTemplateId,
            fieldValuesByTemplateId: entryFieldValuesById,
            textModelsByTemplateId: entryTextModelsByTemplateId,
            exifOverrideValues: { ...exifOverrideSnapshot },
            initialExifOverrideValues: { ...exifOverrideSnapshot },
        };
    }

    function addPhotoEntries(entries = []) {
        photoEntries.push(...entries);
    }

    function setSelectedTemplateId(templateId) {
        selectedTemplateId = templateId;
    }

    function setFieldValues(values) {
        fieldValues = values ?? {};
    }

    function setExifOverrideValues(values) {
        exifOverrideValues = values ?? {};
    }

    function setActiveInspectorPanel(panelKey) {
        activeInspectorPanel = panelKey;
    }

    function setSelectedTextObjectId(objectId) {
        selectedTextObjectId = objectId;
    }

    function setPhotoExportSelection(photoId, isSelected) {
        const entry = photoEntries.find((item) => item.id === photoId);
        if (!entry) {
            return;
        }

        entry.selectedForExport = Boolean(isSelected);
    }

    function createBatchSettingsSnapshot(entry) {
        if (!entry) {
            return null;
        }

        return {
            selectedTemplateId: entry.selectedTemplateId,
            fieldValuesByTemplateId: cloneTemplateFieldValuesMap(entry.fieldValuesByTemplateId),
            textModelsByTemplateId: cloneTextModelMap(entry.textModelsByTemplateId),
        };
    }

    function applyBatchSettingsSnapshot(entry, settings) {
        if (!entry || !settings) {
            return;
        }

        entry.selectedTemplateId = settings.selectedTemplateId;
        entry.fieldValuesByTemplateId = cloneTemplateFieldValuesMap(settings.fieldValuesByTemplateId);
        entry.textModelsByTemplateId = cloneTextModelMap(settings.textModelsByTemplateId);
    }

    function setCopiedBatchSettings(settings) {
        copiedBatchSettings = settings;
    }

    function registerObjectUrl(objectUrl) {
        if (objectUrl) {
            objectUrlRegistry.add(objectUrl);
        }
    }

    function releaseObjectUrl(objectUrl) {
        if (!objectUrl) {
            return;
        }

        URL.revokeObjectURL(objectUrl);
        objectUrlRegistry.delete(objectUrl);
    }

    function releaseAllObjectUrls() {
        objectUrlRegistry.forEach((objectUrl) => {
            URL.revokeObjectURL(objectUrl);
        });
        objectUrlRegistry.clear();
    }

    return {
        getCurrentSnapshot,
        getActivePhotoEntry,
        getTemplateFieldValues,
        saveTemplateFieldValues,
        getPhotoEntryTemplateFieldValues,
        getTemplateTextModel,
        setTemplateTextModel,
        getPhotoEntryTextModel,
        saveActivePhotoState,
        activatePhotoEntry,
        createPhotoEntry,
        addPhotoEntries,
        setSelectedTemplateId,
        setFieldValues,
        setExifOverrideValues,
        setActiveInspectorPanel,
        setSelectedTextObjectId,
        setPhotoExportSelection,
        createBatchSettingsSnapshot,
        applyBatchSettingsSnapshot,
        setCopiedBatchSettings,
        registerObjectUrl,
        releaseObjectUrl,
        releaseAllObjectUrls,
    };
}
