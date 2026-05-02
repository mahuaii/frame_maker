/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { FREE_FRAME_ASPECT_RATIO } from './core/templates/frame-layout.js';
import { buildColorTokenField, resolveTemplateAppearance } from './core/templates/registry.js';
import { loadTemplateConfig } from './core/templates/config-store.js';
import { resolveTemplateConfig } from './core/templates/registry.js';
import { preloadRuntimeFontsInBackground } from './core/fonts/index.js';
import {
    renderFrame,
    calculateFrameMetrics,
    createPhotoSource,
    createEditableExifOverrideValues,
    extractExifData,
    EDITABLE_EXIF_FIELDS,
} from './renderer.js';
import { fitInside, resolveResizeDimensions } from './core/render/sizing.js';
import {
    cloneTextModel,
    createDefaultTextGroup,
    createDefaultTextItem,
    normalizeTextModel,
} from './core/text/index.js';
import { getPathValue, setPathValue } from './core/utils/object-path.js';
import {
    RESET_ICON_PATHS,
    createElement,
    createFieldGroup,
    createIcon,
    createIconButton,
} from './ui/controls.js';
import {
    appendInspectorFields,
    createInspectorFieldGrid,
    createInspectorFieldList,
    createInspectorSection,
    getInspectorSectionContent,
} from './ui/inspector.js';

// ============================================
// 状态管理
// ============================================
let currentImage = null;           // HTMLImageElement | null
let currentPhoto = null;           // Normalized photo source | null
let selectedTemplateId = 'gallery-caption-mat';  // 默认选第一个模板
let fieldValues = {};              // Record<string, string>
let templateFieldValuesById = new Map(); // Map<string, Record<string, string>>
let exifOverrideValues = {};       // Record<string, string>
let initialExifOverrideValues = {}; // 上传后预填写到表单中的 EXIF 快照
let activeInspectorPanel = 'basic';
let selectedTextObjectId = null;
let textModelsByTemplateId = new Map();
const photoEntries = [];
let activePhotoId = null;
let copiedBatchSettings = null;
const objectUrlRegistry = new Set();
let uploadNoticeElement = null;
let uploadNoticeHideTimer = null;
let uploadNoticeDisplayTimer = null;
const THUMBNAIL_MAX_WIDTH = 180;
const THUMBNAIL_MAX_HEIGHT = 135;
const ASSET_VERSION = '20260426-000000';
const DEFAULT_INSPECTOR_WIDTH = 276;
const MIN_INSPECTOR_WIDTH = 220;
const MAX_INSPECTOR_WIDTH = 520;
const MIN_WORKSPACE_WIDTH = 320;
const UPLOAD_NOTICE_DURATION = 2200;
const UPLOAD_NOTICE_FADE_DURATION = 180;
const DEFAULT_EXPORT_SETTINGS = {
    format: 'image/jpeg',
    sizePreset: 'original',
    customWidth: '',
    customHeight: '',
    jpegQuality: 1,
};
const MIN_JPEG_QUALITY = 0.01;
const MAX_JPEG_QUALITY = 1;
let exportSettings = { ...DEFAULT_EXPORT_SETTINGS };

function createPhotoEntryId() {
    return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActivePhotoEntry() {
    return photoEntries.find((entry) => entry.id === activePhotoId) ?? null;
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

function activatePhotoEntry(entry, { render = true } = {}) {
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

    if (!render) {
        return;
    }

    canvas.style.display = 'block';
    uploadGuide.style.display = 'none';
    previewArea.classList.add('has-image');
    updateSelectorSelection();
    renderTextEditor();
    updatePreview();
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

function releaseTextModelObjectUrls(textModel = []) {
    const visit = (items = []) => {
        items.forEach((item) => {
            if (item.type === 'image' && item.source?.type === 'objectUrl' && item.source.src) {
                URL.revokeObjectURL(item.source.src);
                objectUrlRegistry.delete(item.source.src);
            }

            if (item.type === 'group') {
                visit(item.items);
            }
        });
    };

    visit(textModel);
}

function resetCurrentTemplateTextModel() {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    releaseTextModelObjectUrls(getTemplateTextModel(template));
    setTemplateTextModel(template, cloneTextModel(template.textGroups ?? []));
    selectedTextObjectId = getTemplateTextModel(template)[0]?.id ?? null;
    saveActivePhotoState();
    renderTextEditor();
    updatePreview();
}

// ============================================
// DOM 引用
// ============================================
const canvas = document.getElementById('preview-canvas');
const previewArea = document.getElementById('preview-area');
const uploadGuide = document.getElementById('upload-guide');
const fileInput = document.getElementById('file-input');
const selectorList = document.getElementById('selector-list');
const textEditor = document.getElementById('text-editor');
const inspectorResizer = document.getElementById('inspector-resizer');
const mainContent = document.querySelector('.main-content');
let exportControlsRoot = null;
let exportCustomSize = null;
let closeActiveExportMenu = null;
let pendingPreviewResize = 0;

function clampJpegQuality(value) {
    const quality = Number(value);

    if (!Number.isFinite(quality)) {
        return DEFAULT_EXPORT_SETTINGS.jpegQuality;
    }

    return Math.min(Math.max(quality, MIN_JPEG_QUALITY), MAX_JPEG_QUALITY);
}

function parseJpegQualityInput(value) {
    const rawValue = typeof value === 'string' ? value.trim() : value;

    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? clampJpegQuality(rawValue) : null;
    }

    if (typeof rawValue !== 'string') {
        return null;
    }

    const matchedValue = rawValue.match(/^(\d+(?:\.\d+)?)(%)?$/);

    if (!matchedValue) {
        return null;
    }

    const percentage = Number(matchedValue[1]);

    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
        return null;
    }

    return percentage / 100;
}

function formatJpegQualityLabel(quality) {
    return `${Number((clampJpegQuality(quality) * 100).toFixed(2))}%`;
}

function buildJpegQualityOptions() {
    const options = [];

    for (let quality = 100; quality >= 70; quality -= 5) {
        options.push({
            value: quality / 100,
            label: `${quality}%`,
        });
    }

    return options;
}

function clampInspectorWidth(width) {
    const numericWidth = Number(width);
    if (!Number.isFinite(numericWidth)) {
        return DEFAULT_INSPECTOR_WIDTH;
    }

    const viewportLimitedMax = mainContent
        ? Math.max(MIN_INSPECTOR_WIDTH, mainContent.clientWidth - MIN_WORKSPACE_WIDTH)
        : MAX_INSPECTOR_WIDTH;
    const maxWidth = Math.min(MAX_INSPECTOR_WIDTH, viewportLimitedMax);

    return Math.min(Math.max(Math.round(numericWidth), MIN_INSPECTOR_WIDTH), maxWidth);
}

function setInspectorWidth(width) {
    const nextWidth = clampInspectorWidth(width);
    mainContent?.style.setProperty('--inspector-width', `${nextWidth}px`);
    textEditor.style.setProperty('--inspector-width', `${nextWidth}px`);
    inspectorResizer?.setAttribute('aria-valuemin', String(MIN_INSPECTOR_WIDTH));
    inspectorResizer?.setAttribute('aria-valuemax', String(MAX_INSPECTOR_WIDTH));
    inspectorResizer?.setAttribute('aria-valuenow', String(nextWidth));

    return nextWidth;
}

function queuePreviewResize() {
    if (pendingPreviewResize) {
        return;
    }

    pendingPreviewResize = window.requestAnimationFrame(() => {
        pendingPreviewResize = 0;
        updatePreview();
    });
}

const EXPORT_FIELDS = [
    {
        key: 'sizePreset',
        label: '尺寸',
        type: 'select',
        defaultValue: DEFAULT_EXPORT_SETTINGS.sizePreset,
        groupClassName: 'export-field export-size-field field-frame-gray',
        options: [
            { value: 'original', label: '原始尺寸' },
            { value: '1080', label: '长边 1080px' },
            { value: '2048', label: '长边 2048px' },
            { value: 'custom', label: '自定义' },
        ],
    },
    {
        key: 'customWidth',
        label: 'W',
        type: 'number',
        min: 1,
        step: 1,
        inputMode: 'numeric',
        placeholder: '宽度',
    },
    {
        key: 'customHeight',
        label: 'H',
        type: 'number',
        min: 1,
        step: 1,
        inputMode: 'numeric',
        placeholder: '高度',
    },
    {
        key: 'jpegQuality',
        label: 'JPEG 质量',
        type: 'option-input',
        inputMode: 'numeric',
        defaultValue: DEFAULT_EXPORT_SETTINGS.jpegQuality,
        groupClassName: 'export-field export-quality-field field-frame-gray',
        formatValue: formatJpegQualityLabel,
        parseValue: parseJpegQualityInput,
        options: buildJpegQualityOptions(),
    },
];

const UPLOAD_ICON_PATHS = [
    'M6 3h8l4 4v14H6z',
    'M14 3v4h4',
];

function getExtensionForMimeType(mimeType) {
    switch (mimeType) {
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        case 'image/jpeg':
        default:
            return 'jpg';
    }
}

function buildExportFilename(photoName, mimeType) {
    const fallbackBaseName = 'frame_maker_export';
    const sourceName = typeof photoName === 'string' ? photoName.trim() : '';
    const lastDotIndex = sourceName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;
    const baseName = hasExtension ? sourceName.slice(0, lastDotIndex) : sourceName;
    const normalizedBaseName = (baseName || fallbackBaseName).trim() || fallbackBaseName;
    const extension = getExtensionForMimeType(mimeType);

    return `${normalizedBaseName}_framed.${extension}`;
}

function syncExportControls() {
    if (!exportControlsRoot) {
        return;
    }

    const exportSizePreset = exportControlsRoot.querySelector('[data-field-key="sizePreset"]');
    const exportWidthInput = exportControlsRoot.querySelector('[data-field-key="customWidth"]');
    const exportHeightInput = exportControlsRoot.querySelector('[data-field-key="customHeight"]');
    const exportQualityInput = exportControlsRoot.querySelector('[data-field-key="jpegQuality"]');

    if (exportSizePreset) exportSizePreset.value = exportSettings.sizePreset;
    if (exportWidthInput) exportWidthInput.value = exportSettings.customWidth;
    if (exportHeightInput) exportHeightInput.value = exportSettings.customHeight;
    if (exportQualityInput) exportQualityInput.value = formatJpegQualityLabel(exportSettings.jpegQuality);
    exportCustomSize?.classList.toggle('hidden', exportSettings.sizePreset !== 'custom');
}

function setExportSizePreset(sizePreset) {
    exportSettings = {
        ...exportSettings,
        sizePreset,
    };
    syncExportControls();
}

function setCustomExportDimension(key, rawValue) {
    exportSettings = {
        ...exportSettings,
        [key]: rawValue === '' ? '' : rawValue,
    };
    syncExportControls();
}

function setJpegQuality(rawValue) {
    const jpegQuality = typeof rawValue === 'string'
        ? parseJpegQualityInput(rawValue)
        : clampJpegQuality(rawValue);

    if (jpegQuality === null) {
        syncExportControls();
        return;
    }

    exportSettings = {
        ...exportSettings,
        jpegQuality,
    };
    syncExportControls();
}

function getBaseExportDimensions(template, image = currentImage, values = fieldValues) {
    const metrics = calculateFrameMetrics(image, template, 1, values);
    return {
        width: metrics.fullWidth,
        height: metrics.fullHeight,
    };
}

function resolveExportResize(template, image = currentImage, values = fieldValues) {
    return resolveResizeDimensions({
        sizePreset: exportSettings.sizePreset,
        customWidth: exportSettings.customWidth,
        customHeight: exportSettings.customHeight,
        baseDimensions: getBaseExportDimensions(template, image, values),
    });
}

function createThumbnailElement(template) {
    const thumbnailImg = document.createElement('img');
    thumbnailImg.className = 'template-thumbnail';
    thumbnailImg.alt = template.id;
    thumbnailImg.width = THUMBNAIL_MAX_WIDTH;
    thumbnailImg.height = THUMBNAIL_MAX_HEIGHT;
    const thumbnailSources = [
        `thumbnails/${template.id}_thumbnail.png?v=${ASSET_VERSION}`,
        `thumbnails/${template.id}_thumbnail.jpg?v=${ASSET_VERSION}`,
    ];
    let sourceIndex = 0;

    thumbnailImg.addEventListener('error', () => {
        sourceIndex += 1;
        if (sourceIndex < thumbnailSources.length) {
            thumbnailImg.src = thumbnailSources[sourceIndex];
            return;
        }

        const appearance = resolveTemplateAppearance(template, template.defaultConfig);
        const fallbackBackground = appearance.canvasBackground?.color
            ?? appearance.backgroundColor
            ?? template.backgroundColor;
        thumbnailImg.removeAttribute('src');
        thumbnailImg.style.background = fallbackBackground;
        thumbnailImg.style.width = `${THUMBNAIL_MAX_WIDTH}px`;
        thumbnailImg.style.height = `${THUMBNAIL_MAX_HEIGHT}px`;
    });
    thumbnailImg.src = thumbnailSources[sourceIndex];

    return thumbnailImg;
}

function updateSelectorSelection() {
    selectorList.querySelectorAll('.template-card').forEach((card) => {
        card.classList.toggle('selected', card.dataset.templateId === selectedTemplateId);
    });
}

function renderSelectorList() {
    selectorList.innerHTML = '';

    for (const template of templates) {
        const card = document.createElement('div');
        card.className = 'template-card' + (template.id === selectedTemplateId ? ' selected' : '');
        card.dataset.templateId = template.id;
        card.appendChild(createThumbnailElement(template));
        selectorList.appendChild(card);
    }
}

/**
 * 处理模板选择
 */
async function handleTemplateSelect(templateId) {
    if (templateId === selectedTemplateId) return;

    const previousTemplate = getTemplateById(selectedTemplateId);
    saveTemplateFieldValues(previousTemplate, fieldValues);

    selectedTemplateId = templateId;

    const template = getTemplateById(templateId);
    if (template) {
        fieldValues = getTemplateFieldValues(template);
        selectedTextObjectId = getTemplateTextModel(template)[0]?.id ?? null;
    }
    saveActivePhotoState();

    // 重新渲染选择器和编辑区
    updateSelectorSelection();
    renderTextEditor();

    // 更新预览
    await updatePreview();
}

// ============================================
// 文字编辑区渲染
// ============================================
const INSPECTOR_SECTION_DEFINITIONS = [
    { key: 'layout', title: '版式' },
    { key: 'appearance', title: '外观' },
    { key: 'exif', title: '拍摄信息' },
];
const LAYOUT_FIELD_KEYS = new Set([
    'frameAspectRatio',
    'frameBorderWidth',
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);
const FRAME_SIDE_FIELD_KEYS = new Set([
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);
const APPEARANCE_FIELD_KEYS = new Set([
    'colorScheme',
    'showThinBorder',
]);

function renderTextEditor() {
    const template = getTemplateById(selectedTemplateId);

    closeActiveExportMenu?.();
    textEditor.innerHTML = '';
    textEditor.appendChild(createInspectorActionArea());

    if (activeInspectorPanel === 'batch') {
        textEditor.appendChild(createBatchPhotoPanel());
        return;
    }

    if (!template) return;

    if (activeInspectorPanel === 'text') {
        textEditor.appendChild(createTextModelEditorPanel(template));
        return;
    }

    renderBasicInspectorPanel(template);
}

function renderBasicInspectorPanel(template) {
    const visibleFields = template.fields.filter((field) => shouldShowTemplateField(field));
    const fieldsBySection = groupFieldsByInspectorSection(visibleFields);

    INSPECTOR_SECTION_DEFINITIONS.forEach((definition) => {
        const section = createInspectorSection(
            definition.title,
            getInspectorSectionHeaderAction(definition.key)
        );
        const content = getInspectorSectionContent(section);

        switch (definition.key) {
            case 'exif':
                content.appendChild(createExifEditorContent());
                break;
            default:
                appendFieldSectionContent(content, fieldsBySection[definition.key], definition.key);
        }

        textEditor.appendChild(section);
    });
}

function getInspectorSectionHeaderAction(sectionKey) {
    switch (sectionKey) {
        case 'layout':
            return createLayoutEditorResetAllButton();
        case 'exif':
            return createExifEditorResetAllButton();
        default:
            return null;
    }
}

function groupFieldsByInspectorSection(fields) {
    const groups = {
        layout: [],
        appearance: [],
    };

    fields.forEach((field) => {
        if (LAYOUT_FIELD_KEYS.has(field.key)) {
            groups.layout.push(field);
            return;
        }

        if (APPEARANCE_FIELD_KEYS.has(field.key)) {
            groups.appearance.push(field);
            return;
        }

    });

    return groups;
}

function appendFieldSectionContent(content, fields, sectionKey) {
    if (sectionKey === 'layout') {
        appendLayoutSectionContent(content, fields);
        return;
    }

    appendInspectorFields(content, fields, {
        values: fieldValues,
        onChange: commitFieldValue,
        compact: sectionKey === 'layout',
        getLabel: getCompactFieldLabel,
    });
}

function isFreeFrameLayout() {
    return (fieldValues.frameAspectRatio ?? FREE_FRAME_ASPECT_RATIO) === FREE_FRAME_ASPECT_RATIO;
}

function shouldShowTemplateField(field) {
    if (field.hidden) {
        return false;
    }

    if (field.key === 'frameBorderWidth') {
        return !isFreeFrameLayout();
    }

    if (FRAME_SIDE_FIELD_KEYS.has(field.key)) {
        return isFreeFrameLayout();
    }

    return true;
}

function appendLayoutSectionContent(content, fields) {
    const aspectField = fields.find((field) => field.key === 'frameAspectRatio');
    const borderField = fields.find((field) => field.key === 'frameBorderWidth');
    const sideFields = fields.filter((field) => FRAME_SIDE_FIELD_KEYS.has(field.key));

    if (aspectField) {
        appendInspectorFields(content, [aspectField], {
            values: fieldValues,
            onChange: commitFieldValue,
        });
    }

    if (isFreeFrameLayout()) {
        appendInspectorFields(content, sideFields, {
            values: fieldValues,
            onChange: commitFieldValue,
            compact: true,
            getLabel: getCompactFieldLabel,
        });
        return;
    }

    if (borderField) {
        appendInspectorFields(content, [borderField], {
            values: fieldValues,
            onChange: commitFieldValue,
        });
    }
}

function getCompactFieldLabel(field) {
    const compactLabels = {
        frameTop: 'T',
        frameRight: 'R',
        frameBottom: 'B',
        frameLeft: 'L',
    };

    return compactLabels[field.key] ?? field.label;
}

function commitFieldValue(field, nextValue) {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    fieldValues[field.key] = nextValue;
    fieldValues = resolveTemplateConfig(template, fieldValues);
    saveTemplateFieldValues(template, fieldValues);

    if (field.key === 'frameAspectRatio' || field.key === 'colorScheme') {
        renderTextEditor();
    }
    saveActivePhotoState();

    updatePreview();
}

function resetAllLayoutFieldValues() {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    const defaultConfig = resolveTemplateConfig(template);
    const resetValues = {};

    LAYOUT_FIELD_KEYS.forEach((fieldKey) => {
        if (defaultConfig[fieldKey] !== undefined) {
            resetValues[fieldKey] = defaultConfig[fieldKey];
        }
    });

    fieldValues = resolveTemplateConfig(template, {
        ...fieldValues,
        ...resetValues,
    });
    saveTemplateFieldValues(template, fieldValues);
    saveActivePhotoState();

    renderTextEditor();
    updatePreview();
}

function createLayoutEditorResetAllButton() {
    return createIconButton({
        className: 'field-reset-button inspector-section-reset-button',
        label: '重置版式',
        iconPaths: RESET_ICON_PATHS,
        onClick: () => {
            resetAllLayoutFieldValues();
        },
    });
}

function getExifEditorFieldValue(fieldKey) {
    const currentValue = exifOverrideValues[fieldKey];
    if (currentValue === null || currentValue === undefined) {
        return '';
    }

    return String(currentValue);
}

function commitExifFieldValue(fieldKey, nextValue) {
    exifOverrideValues = {
        ...exifOverrideValues,
        [fieldKey]: nextValue,
    };
    saveActivePhotoState();

    updatePreview();
}

function resetAllExifFieldValues() {
    const resetValues = {};

    EDITABLE_EXIF_FIELDS.forEach((field) => {
        resetValues[field.key] = initialExifOverrideValues[field.key] ?? '';
    });

    exifOverrideValues = {
        ...exifOverrideValues,
        ...resetValues,
    };
    saveActivePhotoState();

    renderTextEditor();
    updatePreview();
}

function createExifEditorResetAllButton() {
    return createIconButton({
        className: 'field-reset-button inspector-section-reset-button',
        label: '重置拍摄信息',
        iconPaths: RESET_ICON_PATHS,
        onClick: () => {
            resetAllExifFieldValues();
        },
    });
}

function createExifEditorContent() {
    const fields = EDITABLE_EXIF_FIELDS.map((field) => ({
        ...field,
        type: field.type ?? 'input',
        defaultValue: '',
    }));
    const primaryFieldKeys = ['focalLength', 'fNumber', 'exposureTime', 'iso'];
    const exifFieldValues = fields.reduce((values, field) => {
        values[field.key] = getExifEditorFieldValue(field.key);
        return values;
    }, {});
    const fieldOptions = {
        values: exifFieldValues,
        idPrefix: 'field-exif',
        onChange: (field, nextValue) => {
            commitExifFieldValue(field.key, nextValue);
        },
    };
    const primaryFields = primaryFieldKeys
        .map((fieldKey) => fields.find((field) => field.key === fieldKey))
        .filter(Boolean);
    const remainingFields = fields.filter((field) => !primaryFieldKeys.includes(field.key));
    const content = createElement('div', {
        className: 'exif-editor-content',
    });

    if (primaryFields.length > 0) {
        content.appendChild(createInspectorFieldGrid(primaryFields, {
            ...fieldOptions,
            compact: false,
        }));
    }

    if (remainingFields.length > 0) {
        content.appendChild(createInspectorFieldList(remainingFields, fieldOptions));
    }

    return content;
}

function commitExportFieldValue(field, nextValue) {
    switch (field.key) {
        case 'sizePreset':
            setExportSizePreset(nextValue);
            break;
        case 'customWidth':
            setCustomExportDimension('customWidth', String(nextValue).trim());
            break;
        case 'customHeight':
            setCustomExportDimension('customHeight', String(nextValue).trim());
            break;
        case 'jpegQuality':
            setJpegQuality(nextValue);
            break;
        default:
            break;
    }
}

function createUploadButton() {
    const icon = createIcon(UPLOAD_ICON_PATHS, {
        viewBox: '0 0 24 24',
        attributes: {
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
        },
    });
    const button = createElement('button', {
        className: 'btn inspector-upload-button',
        attributes: {
            type: 'button',
            'aria-label': '上传照片',
            title: '上传照片',
        },
        children: [icon],
    });

    button.addEventListener('click', () => {
        fileInput.click();
    });

    return button;
}

function createExportButton() {
    const menuId = 'export-settings-menu';
    const wrapper = createElement('div', {
        className: 'export-split-button',
    });
    const actionButton = createElement('button', {
        className: 'export-split-action',
        attributes: {
            type: 'button',
            id: 'btn-export',
        },
        children: [
            createElement('span', {
                textContent: '导出',
            }),
        ],
    });
    const toggleButton = createElement('button', {
        className: 'export-menu-toggle',
        attributes: {
            type: 'button',
            'aria-label': '展开导出设置',
            'aria-controls': menuId,
            'aria-expanded': 'false',
            title: '导出设置',
        },
    });
    const menu = createElement('div', {
        className: 'export-settings-menu',
        attributes: {
            id: menuId,
            hidden: true,
        },
        children: [
            createExportControls(),
        ],
    });

    function removeMenuListeners() {
        document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
        document.removeEventListener('keydown', handleDocumentKeyDown);
    }

    function closeMenu({ restoreFocus = false } = {}) {
        if (menu.hidden) {
            return;
        }

        menu.hidden = true;
        wrapper.classList.remove('is-open');
        toggleButton.setAttribute('aria-expanded', 'false');
        removeMenuListeners();

        if (closeActiveExportMenu === closeMenu) {
            closeActiveExportMenu = null;
        }

        if (restoreFocus) {
            toggleButton.focus();
        }
    }

    function openMenu() {
        if (typeof closeActiveExportMenu === 'function' && closeActiveExportMenu !== closeMenu) {
            closeActiveExportMenu();
        }

        syncExportControls();
        menu.hidden = false;
        wrapper.classList.add('is-open');
        toggleButton.setAttribute('aria-expanded', 'true');
        closeActiveExportMenu = closeMenu;
        document.addEventListener('pointerdown', handleDocumentPointerDown, true);
        document.addEventListener('keydown', handleDocumentKeyDown);
    }

    function toggleMenu() {
        if (menu.hidden) {
            openMenu();
            return;
        }

        closeMenu();
    }

    function handleDocumentPointerDown(event) {
        if (!wrapper.contains(event.target)) {
            closeMenu();
        }
    }

    function handleDocumentKeyDown(event) {
        if (event.key === 'Escape') {
            closeMenu({ restoreFocus: true });
            return;
        }

        if (event.key === 'Tab') {
            window.setTimeout(() => {
                if (!wrapper.contains(document.activeElement)) {
                    closeMenu();
                }
            }, 0);
        }
    }

    actionButton.addEventListener('click', () => {
        handleExport();
    });
    toggleButton.addEventListener('click', () => {
        toggleMenu();
    });

    wrapper.append(actionButton, toggleButton, menu);

    return wrapper;
}

function createExportControls() {
    const controls = createElement('div', {
        className: 'export-controls',
    });
    const fieldOptions = {
        values: exportSettings,
        idPrefix: 'export',
        onChange: commitExportFieldValue,
    };
    const sizePresetField = EXPORT_FIELDS.find((field) => field.key === 'sizePreset');
    const customWidthField = EXPORT_FIELDS.find((field) => field.key === 'customWidth');
    const customHeightField = EXPORT_FIELDS.find((field) => field.key === 'customHeight');
    const jpegQualityField = EXPORT_FIELDS.find((field) => field.key === 'jpegQuality');

    exportControlsRoot = controls;
    exportCustomSize = createElement('div', {
        className: 'export-custom-size inspector-field-grid inspector-field-grid-contained',
        attributes: {
            id: 'export-custom-size',
        },
        children: [
            createFieldGroup(customWidthField, fieldOptions),
            createFieldGroup(customHeightField, fieldOptions),
        ],
    });
    const primaryFields = createElement('div', {
        className: 'export-primary-fields',
        children: [
            createFieldGroup(sizePresetField, fieldOptions),
            createFieldGroup(jpegQualityField, fieldOptions),
        ],
    });

    controls.append(
        primaryFields,
        exportCustomSize,
    );
    syncExportControls();

    return controls;
}

function createInspectorActionArea() {
    const actionArea = createElement('div', {
        className: 'inspector-action-area',
    });
    const primaryActions = createElement('div', {
        className: 'inspector-action-row',
        children: [
            createUploadButton(),
            createExportButton(),
        ],
    });
    const panelTabs = createElement('div', {
        className: 'inspector-panel-tabs',
        attributes: {
            role: 'tablist',
            'aria-label': '设置面板',
        },
        children: [
            createInspectorPanelTab('basic', '基本'),
            createInspectorPanelTab('text', '文本'),
            createInspectorPanelTab('batch', '批量'),
        ],
    });

    actionArea.append(
        primaryActions,
        panelTabs
    );

    return actionArea;
}

function createInspectorPanelTab(panelKey, label) {
    const isSelected = activeInspectorPanel === panelKey;
    const button = createElement('button', {
        className: `inspector-panel-tab${isSelected ? ' selected' : ''}`,
        textContent: label,
        attributes: {
            type: 'button',
            role: 'tab',
            'aria-selected': isSelected ? 'true' : 'false',
        },
    });

    button.addEventListener('click', () => {
        if (activeInspectorPanel === panelKey) {
            return;
        }

        activeInspectorPanel = panelKey;
        renderTextEditor();
    });

    return button;
}

function formatPhotoMeta(entry) {
    const width = entry.photo?.width ?? 0;
    const height = entry.photo?.height ?? 0;

    if (!width || !height) {
        return '';
    }

    return `${width} × ${height}`;
}

function setPhotoExportSelection(photoId, isSelected) {
    const entry = photoEntries.find((item) => item.id === photoId);
    if (!entry) {
        return;
    }

    entry.selectedForExport = Boolean(isSelected);
    renderTextEditor();
}

function handlePhotoCardSelect(photoId) {
    const entry = photoEntries.find((item) => item.id === photoId);
    if (!entry || entry.id === activePhotoId) {
        return;
    }

    saveActivePhotoState();
    activatePhotoEntry(entry);
}

function copyCurrentPhotoSettings() {
    const entry = getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    saveActivePhotoState();
    copiedBatchSettings = {
        selectedTemplateId: entry.selectedTemplateId,
        fieldValuesByTemplateId: cloneTemplateFieldValuesMap(entry.fieldValuesByTemplateId),
        textModelsByTemplateId: cloneTextModelMap(entry.textModelsByTemplateId),
    };
    renderTextEditor();
}

function applyBatchSettingsSnapshot(entry, settings) {
    if (!entry || !settings) {
        return;
    }

    entry.selectedTemplateId = settings.selectedTemplateId;
    entry.fieldValuesByTemplateId = cloneTemplateFieldValuesMap(settings.fieldValuesByTemplateId);
    entry.textModelsByTemplateId = cloneTextModelMap(settings.textModelsByTemplateId);
}

function pasteCopiedSettingsToCurrentPhoto() {
    if (!copiedBatchSettings) {
        alert('请先复制当前照片设置');
        return;
    }

    const entry = getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    saveActivePhotoState();
    applyBatchSettingsSnapshot(entry, copiedBatchSettings);
    activatePhotoEntry(entry);
}

function applyCurrentPhotoSettingsToAllPhotos() {
    const entry = getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    saveActivePhotoState();
    const sourceSettings = {
        selectedTemplateId: entry.selectedTemplateId,
        fieldValuesByTemplateId: cloneTemplateFieldValuesMap(entry.fieldValuesByTemplateId),
        textModelsByTemplateId: cloneTextModelMap(entry.textModelsByTemplateId),
    };

    photoEntries.forEach((photoEntry) => {
        applyBatchSettingsSnapshot(photoEntry, sourceSettings);
    });

    const activeEntry = getActivePhotoEntry();
    if (activeEntry) {
        activatePhotoEntry(activeEntry);
        return;
    }

    renderTextEditor();
}

function createBatchPhotoCard(entry) {
    const isActive = entry.id === activePhotoId;
    const checkbox = createElement('input', {
        className: 'batch-photo-checkbox',
        attributes: {
            type: 'checkbox',
            checked: entry.selectedForExport,
            'aria-label': `选择导出 ${entry.photo?.name ?? '照片'}`,
        },
    });
    const thumbnail = createElement('img', {
        className: 'batch-photo-thumbnail',
        attributes: {
            alt: '',
            'aria-hidden': 'true',
            src: entry.objectUrl,
        },
    });
    const name = createElement('span', {
        className: 'batch-photo-name',
        textContent: entry.photo?.name ?? '未命名照片',
    });
    const meta = createElement('span', {
        className: 'batch-photo-meta',
        textContent: formatPhotoMeta(entry),
    });
    const card = createElement('div', {
        className: `batch-photo-card${isActive ? ' selected' : ''}`,
        attributes: {
            role: 'button',
            tabindex: '0',
            'aria-pressed': isActive ? 'true' : 'false',
        },
        dataset: {
            photoId: entry.id,
        },
        children: [
            thumbnail,
            createElement('span', {
                className: 'batch-photo-info',
                children: [name, meta],
            }),
            createElement('span', {
                className: 'checkbox-field batch-photo-check-wrap',
                children: [checkbox],
            }),
        ],
    });

    checkbox.parentElement?.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    checkbox.addEventListener('change', (event) => {
        setPhotoExportSelection(entry.id, event.target.checked);
    });
    card.addEventListener('click', () => {
        handlePhotoCardSelect(entry.id);
    });
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePhotoCardSelect(entry.id);
        }
    });

    return card;
}

function createBatchPhotoPanel() {
    const selectedCount = photoEntries.filter((entry) => entry.selectedForExport).length;
    const section = createInspectorSection('照片列表');
    const content = getInspectorSectionContent(section);
    const actions = createElement('div', {
        className: 'batch-actions inspector-content-contained',
        children: [
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '复制设置',
                attributes: {
                    type: 'button',
                    disabled: !activePhotoId,
                },
            }),
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '粘贴设置',
                attributes: {
                    type: 'button',
                    disabled: !copiedBatchSettings || !activePhotoId,
                },
            }),
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '应用到全部',
                attributes: {
                    type: 'button',
                    disabled: !activePhotoId || photoEntries.length === 0,
                },
            }),
        ],
    });
    const summary = createElement('div', {
        className: 'batch-summary inspector-content-contained',
        textContent: photoEntries.length > 0
            ? `共 ${photoEntries.length} 张，已选择 ${selectedCount} 张导出`
            : '尚未上传照片',
    });
    const list = createElement('div', {
        className: 'batch-photo-list inspector-content-contained',
    });

    actions.children[0].addEventListener('click', copyCurrentPhotoSettings);
    actions.children[1].addEventListener('click', pasteCopiedSettingsToCurrentPhoto);
    actions.children[2].addEventListener('click', applyCurrentPhotoSettingsToAllPhotos);

    if (photoEntries.length > 0) {
        photoEntries.forEach((entry) => {
            list.appendChild(createBatchPhotoCard(entry));
        });
    }

    content.append(actions, summary, list);
    return section;
}

function getTextObjectTypeLabel(item) {
    const labels = {
        group: '组',
        text: '文',
        separator: '线',
        image: '图',
    };

    return labels[item?.type] ?? '?';
}

function summarizeTextObjectContent(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function getFirstTextObjectContent(item) {
    if (!item) {
        return '';
    }

    if (item.type === 'text') {
        return summarizeTextObjectContent(item.content);
    }

    if (item.type === 'group' && Array.isArray(item.items)) {
        for (const child of item.items) {
            const content = getFirstTextObjectContent(child);
            if (content) {
                return content;
            }
        }
    }

    return '';
}

function getTextObjectDisplayLabel(item, depth = 0) {
    if (item?.type === 'text') {
        return getFirstTextObjectContent(item) || '文字';
    }

    if (item?.type === 'group') {
        return summarizeTextObjectContent(item.label) || (depth > 0 ? '子组' : '文本组');
    }

    if (item?.type === 'separator') {
        return '分隔线';
    }

    if (item?.type === 'image') {
        return summarizeTextObjectContent(item.source?.name) || '图片';
    }

    return getTextObjectTypeLabel(item);
}

function findTextObjectById(items = [], objectId, parent = null, depth = 0) {
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.id === objectId) {
            return { item, parent, index, depth, siblings: items };
        }

        if (item.type === 'group') {
            const found = findTextObjectById(item.items ?? [], objectId, item, depth + 1);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

function ensureSelectedTextObject(template) {
    const textModel = getTemplateTextModel(template);
    if (selectedTextObjectId && findTextObjectById(textModel, selectedTextObjectId)) {
        return selectedTextObjectId;
    }

    selectedTextObjectId = textModel[0]?.id ?? null;
    return selectedTextObjectId;
}

function commitTextModelChange(template, mutate, {
    renderEditor = true,
} = {}) {
    const textModel = getTemplateTextModel(template);
    const result = mutate(textModel);
    if (result === false) {
        return false;
    }

    setTemplateTextModel(template, textModel);
    ensureSelectedTextObject(template);
    saveActivePhotoState();
    if (renderEditor) {
        renderTextEditor();
    }
    updatePreview();

    return true;
}

function createTextModelEditorPanel(template) {
    ensureSelectedTextObject(template);

    return createElement('div', {
        className: 'text-model-editor',
        children: [
            createTextObjectTree(template),
            createSelectedTextObjectPanel(template),
        ],
    });
}

function createTextObjectTree(template) {
    const textModel = getTemplateTextModel(template);
    const header = createElement('div', {
        className: 'text-object-tree-header',
        children: [
            createElement('span', { textContent: '组 / 项' }),
            createElement('div', {
                className: 'text-object-tree-actions',
                children: [
                    createIconButton({
                        className: 'field-reset-button',
                        label: '重置文本',
                        iconPaths: RESET_ICON_PATHS,
                        onClick: resetCurrentTemplateTextModel,
                    }),
                    createElement('button', {
                        className: 'btn-small text-object-add-button',
                        textContent: '新增文本组',
                        attributes: { type: 'button' },
                    }),
                ],
            }),
        ],
    });
    const addButton = header.querySelector('.text-object-add-button');
    addButton.addEventListener('click', () => {
        commitTextModelChange(template, (model) => {
            const group = createDefaultTextGroup();
            model.push(group);
            selectedTextObjectId = group.id;
        });
    });

    const list = createElement('div', {
        className: 'text-object-tree-list',
    });

    if (textModel.length === 0) {
        list.appendChild(createElement('div', {
            className: 'text-object-empty',
            textContent: '暂无文本组',
        }));
    } else {
        textModel.forEach((group) => {
            list.appendChild(createTextObjectTreeNode(template, group, 0));
        });
    }

    return createElement('div', {
        className: 'text-object-tree inspector-content-contained',
        children: [header, list],
    });
}

function createTextObjectTreeNode(template, item, depth) {
    const isSelected = item.id === selectedTextObjectId;
    const node = createElement('div', {
        className: `text-object-node${isSelected ? ' selected' : ''}`,
        dataset: {
            textObjectId: item.id,
        },
        styleProperties: {
            '--text-object-depth': depth,
        },
    });
    const row = createElement('button', {
        className: 'text-object-row',
        attributes: {
            type: 'button',
        },
        children: [
            createElement('span', {
                className: 'text-object-type',
                textContent: getTextObjectTypeLabel(item),
            }),
            createElement('span', {
                className: 'text-object-label',
                textContent: getTextObjectDisplayLabel(item, depth),
            }),
            createElement('span', {
                className: 'text-object-status',
                textContent: item.visible === false ? '隐藏' : '',
            }),
        ],
    });

    row.addEventListener('click', () => {
        selectedTextObjectId = item.id;
        renderTextEditor();
    });
    node.appendChild(row);

    if (item.type === 'group' && Array.isArray(item.items) && item.items.length > 0) {
        item.items.forEach((child) => {
            node.appendChild(createTextObjectTreeNode(template, child, depth + 1));
        });
    }

    return node;
}

function createSelectedTextObjectPanel(template) {
    const selectedId = ensureSelectedTextObject(template);
    const textModel = getTemplateTextModel(template);
    const selected = selectedId ? findTextObjectById(textModel, selectedId) : null;

    if (!selected) {
        return createElement('div', {
            className: 'text-object-properties text-object-empty inspector-content-contained',
            textContent: '选择或新增文本组',
        });
    }

    return createElement('div', {
        className: 'text-object-properties',
        children: [
            createTextObjectActionBar(template, selected),
            createTextObjectFields(template, selected),
        ],
    });
}

function createTextObjectActionBar(template, selected) {
    const { item, siblings, index, depth } = selected;
    const itemId = item.id;
    const actions = createElement('div', {
        className: 'text-object-action-bar inspector-content-contained',
    });

    if (item.type === 'group') {
        [
            ['text', '文字'],
            ['separator', '分隔线'],
            ['image', '图片'],
            ...(depth === 0 ? [['group', '子组']] : []),
        ].forEach(([type, label]) => {
            const button = createElement('button', {
                className: 'btn-small text-object-action',
                textContent: `+${label}`,
                attributes: { type: 'button' },
            });
            button.addEventListener('click', () => {
                commitTextModelChange(template, (model) => {
                    const current = findTextObjectById(model, itemId);
                    if (!current || current.item.type !== 'group') {
                        return false;
                    }

                    const nextItem = createDefaultTextItem(type);
                    current.item.items = Array.isArray(current.item.items) ? current.item.items : [];
                    current.item.items.push(nextItem);
                    selectedTextObjectId = nextItem.id;
                });
            });
            actions.appendChild(button);
        });
    }

    [
        ['上移', -1],
        ['下移', 1],
    ].forEach(([label, direction]) => {
        const button = createElement('button', {
            className: 'btn-small text-object-action',
            textContent: label,
            attributes: {
                type: 'button',
                disabled: direction < 0 ? index <= 0 : index >= siblings.length - 1,
            },
        });
        button.addEventListener('click', () => {
            commitTextModelChange(template, (model) => {
                const current = findTextObjectById(model, itemId);
                if (!current) {
                    return false;
                }

                const nextIndex = current.index + direction;
                if (nextIndex < 0 || nextIndex >= current.siblings.length) {
                    return false;
                }

                const [movedItem] = current.siblings.splice(current.index, 1);
                current.siblings.splice(nextIndex, 0, movedItem);
            });
        });
        actions.appendChild(button);
    });

    const deleteButton = createElement('button', {
        className: 'btn-small text-object-action danger',
        textContent: '删除',
        attributes: {
            type: 'button',
        },
    });
    deleteButton.addEventListener('click', () => {
        commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            releaseTextModelObjectUrls([current.item]);
            current.siblings.splice(current.index, 1);
            selectedTextObjectId = current.siblings[Math.min(current.index, current.siblings.length - 1)]?.id
                ?? current.parent?.id
                ?? null;
        });
    });
    actions.appendChild(deleteButton);

    return actions;
}

function createTextObjectFields(template, selected) {
    const { item, depth } = selected;
    const fields = buildTextObjectFieldDefinitions(item, depth, template);
    const values = buildTextObjectFieldValues(item, fields);
    const fieldOptions = {
        values,
        idPrefix: `text-object-${item.id}`,
        onChange: (field, nextValue) => {
            commitTextObjectFieldValue(template, item, field.key, nextValue);
        },
    };
    const list = item.type === 'group' && depth === 0
        ? createRootTextGroupFieldList(fields, fieldOptions)
        : createInspectorFieldList(fields, fieldOptions);

    if (item.type === 'image') {
        list.appendChild(createImageSourceControl(template, item));
    }

    return list;
}

function createRootTextGroupFieldList(fields, fieldOptions) {
    const anchorLayoutFieldKeys = new Set(['region', 'anchor', 'direction']);
    const content = createElement('div', {
        className: 'editor-collapsible-content',
    });

    fields.forEach((field) => {
        if (field.key === 'region') {
            content.appendChild(createTextGroupAnchorLayout(fields, fieldOptions));
            return;
        }

        if (anchorLayoutFieldKeys.has(field.key)) {
            return;
        }

        content.appendChild(createFieldGroup(field, fieldOptions));
    });

    return content;
}

function createTextGroupAnchorLayout(fields, fieldOptions) {
    const anchorField = fields.find((field) => field.key === 'anchor');
    const sideFields = ['region', 'direction']
        .map((fieldKey) => fields.find((field) => field.key === fieldKey))
        .filter(Boolean);
    const fieldGroups = [anchorField, ...sideFields]
        .filter(Boolean)
        .map((field) => createFieldGroup(field, fieldOptions));

    return createElement('div', {
        className: 'text-group-anchor-layout inspector-field-grid-contained',
        children: fieldGroups,
    });
}

const TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS = new Set(['label', 'style.fontId', 'style.fontStyle']);

function applyTextEditorFieldFrameStyle(fields = []) {
    return fields.map((field) => {
        if (!field || TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS.has(field.key)) {
            return field;
        }

        const classNames = new Set(String(field.groupClassName ?? '').split(/\s+/).filter(Boolean));
        classNames.add('field-frame-gray');

        return {
            ...field,
            groupClassName: Array.from(classNames).join(' '),
        };
    });
}

function buildTextObjectFieldDefinitions(item, depth, template) {
    const activeAppearanceKey = resolveTemplateAppearance(template, fieldValues).key;
    const commonFields = [
        { key: 'visible', label: '显示', type: 'toggle', defaultValue: true },
    ];
    const styleFields = [
        {
            key: 'style.fontId',
            label: '字体',
            type: 'select',
            defaultValue: 'systemSans',
            options: [
                { value: 'systemSans', label: 'System Sans' },
                { value: 'miSans', label: 'MiSans' },
                { value: 'angieSansStd', label: 'Angie Sans Std' },
                { value: 'timesNewRoman', label: 'Times New Roman' },
            ],
        },
        { key: 'style.fontScale', label: '字号倍率', type: 'number', min: 0.1, step: 0.05, defaultValue: 1 },
        { key: 'style.fontWeight', label: '字重', type: 'number', min: 100, max: 900, step: 50, defaultValue: 400 },
        {
            key: 'style.fontStyle',
            label: '字体样式',
            type: 'select',
            defaultValue: 'normal',
            options: [
                { value: 'normal', label: '常规' },
                { value: 'italic', label: '斜体' },
            ],
        },
        buildColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
            key: 'style.colorToken',
            label: '颜色',
            defaultValue: 'textPrimary',
        }),
        { key: 'style.color', label: '自定义颜色', type: 'color', defaultValue: '#111111' },
        { key: 'style.letterSpacingScale', label: '字距倍率', type: 'number', step: 0.01, defaultValue: 0 },
    ];

    if (item.type === 'group') {
        return applyTextEditorFieldFrameStyle([
            { key: 'label', label: '组标题', type: 'input', defaultValue: depth > 0 ? '子组' : '文本组' },
            ...commonFields,
            ...(depth === 0 ? [
                {
                    key: 'region',
                    label: '位置边区',
                    type: 'select',
                    defaultValue: 'bottom',
                    options: [
                        { value: 'top', label: '上' },
                        { value: 'right', label: '右' },
                        { value: 'bottom', label: '下' },
                        { value: 'left', label: '左' },
                    ],
                },
                {
                    key: 'anchor',
                    label: '锚点',
                    type: 'select',
                    control: 'nine-grid',
                    defaultValue: 'center',
                    options: [
                        { value: 'top-left', label: '左上' },
                        { value: 'top-center', label: '上中' },
                        { value: 'top-right', label: '右上' },
                        { value: 'middle-left', label: '左中' },
                        { value: 'center', label: '中心' },
                        { value: 'middle-right', label: '右中' },
                        { value: 'bottom-left', label: '左下' },
                        { value: 'bottom-center', label: '下中' },
                        { value: 'bottom-right', label: '右下' },
                    ],
                },
            ] : []),
            {
                key: 'direction',
                label: '排列方向',
                type: 'select',
                defaultValue: 'vertical',
                options: [
                    { value: 'vertical', label: '垂直' },
                    { value: 'horizontal', label: '水平' },
                ],
            },
            {
                key: 'align',
                label: '对齐方式',
                type: 'select',
                defaultValue: 'center',
                options: [
                    { value: 'start', label: '起始' },
                    { value: 'center', label: '居中' },
                    { value: 'end', label: '结束' },
                ],
            },
            { key: 'gapScale', label: '组内间距倍率', type: 'number', step: 0.05, defaultValue: 0.4 },
            ...(depth === 0 ? [
                { key: 'offsetXScale', label: 'X 偏移倍率', type: 'number', step: 0.1, defaultValue: 0 },
                { key: 'offsetYScale', label: 'Y 偏移倍率', type: 'number', step: 0.1, defaultValue: 0 },
            ] : []),
            ...styleFields,
        ]);
    }

    if (item.type === 'text') {
        return applyTextEditorFieldFrameStyle([
            ...commonFields,
            { key: 'content', label: '内容', type: 'textarea', defaultValue: '' },
            ...styleFields,
        ]);
    }

    if (item.type === 'separator') {
        return applyTextEditorFieldFrameStyle([
            ...commonFields,
            { key: 'forceVisible', label: '强制显示', type: 'toggle', defaultValue: false },
            { key: 'lengthScale', label: '长度倍率', type: 'number', min: 0.1, step: 0.05, defaultValue: 1.4 },
            { key: 'thicknessScale', label: '粗细倍率', type: 'number', min: 0.01, step: 0.01, defaultValue: 0.06 },
            buildColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
                key: 'colorToken',
                label: '颜色',
                defaultValue: 'separator',
            }),
            { key: 'color', label: '自定义颜色', type: 'color', defaultValue: '#9CA3AF' },
        ]);
    }

    return applyTextEditorFieldFrameStyle(commonFields);
}

function buildTextObjectFieldValues(item, fields) {
    return fields.reduce((values, field) => {
        values[field.key] = getPathValue(item, field.key) ?? field.defaultValue ?? '';
        return values;
    }, {});
}

function commitTextObjectFieldValue(template, item, fieldKey, nextValue) {
    const itemId = item.id;
    const committed = commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        setPathValue(current.item, fieldKey, nextValue);
    }, {
        renderEditor: false,
    });

    if (committed) {
        syncTextObjectTreeNode(template, itemId);
    }
}

function syncTextObjectTreeNode(template, itemId) {
    const textModel = getTemplateTextModel(template);
    const current = findTextObjectById(textModel, itemId);
    if (!current) {
        return;
    }

    const node = Array.from(textEditor.querySelectorAll('.text-object-node'))
        .find((candidate) => candidate.dataset.textObjectId === String(itemId));
    if (!node) {
        return;
    }

    const label = node.querySelector(':scope > .text-object-row > .text-object-label');
    const status = node.querySelector(':scope > .text-object-row > .text-object-status');

    if (label) {
        label.textContent = getTextObjectDisplayLabel(current.item, current.depth);
    }

    if (status) {
        status.textContent = current.item.visible === false ? '隐藏' : '';
    }
}

function createImageSourceControl(template, item) {
    const itemId = item.id;
    const wrapper = createElement('div', {
        className: 'image-source-control inspector-content-contained',
    });
    const label = createElement('div', {
        className: 'field-group-label',
        textContent: item.source?.name || '未选择图片',
    });
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    const chooseButton = createElement('button', {
        className: 'btn btn-secondary',
        textContent: item.source ? '替换图片' : '选择图片',
        attributes: { type: 'button' },
    });
    const clearButton = createElement('button', {
        className: 'btn',
        textContent: '清除图片',
        attributes: {
            type: 'button',
            disabled: !item.source,
        },
    });

    chooseButton.addEventListener('click', () => {
        input.click();
    });
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        objectUrlRegistry.add(objectUrl);
        const committed = commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            releaseTextModelObjectUrls([current.item]);
            current.item.source = {
                type: 'objectUrl',
                src: objectUrl,
                name: file.name,
            };
        });
        if (!committed) {
            URL.revokeObjectURL(objectUrl);
            objectUrlRegistry.delete(objectUrl);
        }
    });
    clearButton.addEventListener('click', () => {
        commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            releaseTextModelObjectUrls([current.item]);
            current.item.source = null;
        });
    });

    wrapper.append(label, input, chooseButton, clearButton);
    return wrapper;
}

// ============================================
// 图片上传处理
// ============================================

function getPhotoEntryFileName(entry) {
    return entry?.file?.name || entry?.photo?.name || '';
}

function getUploadedPhotoFileNames() {
    return new Set(photoEntries.map(getPhotoEntryFileName).filter(Boolean));
}

function filterDuplicateImageFiles(files) {
    const usedFileNames = getUploadedPhotoFileNames();
    const acceptedFiles = [];
    const duplicateNames = [];

    files.forEach((file) => {
        const fileName = file?.name || '';

        if (fileName && usedFileNames.has(fileName)) {
            duplicateNames.push(fileName);
            return;
        }

        acceptedFiles.push(file);

        if (fileName) {
            usedFileNames.add(fileName);
        }
    });

    return { acceptedFiles, duplicateNames };
}

function formatDuplicateUploadNotice(duplicateNames) {
    const duplicateCount = duplicateNames.length;
    return `已忽略 ${duplicateCount} 张重名照片`;

}

function getUploadNoticeElement() {
    if (uploadNoticeElement) {
        return uploadNoticeElement;
    }

    uploadNoticeElement = createElement('div', {
        className: 'upload-notice',
        attributes: {
            id: 'upload-notice',
            role: 'status',
            'aria-live': 'polite',
            hidden: true,
        },
    });
    previewArea.appendChild(uploadNoticeElement);

    return uploadNoticeElement;
}

function showUploadNotice(message) {
    if (!message) {
        return;
    }

    const notice = getUploadNoticeElement();
    notice.textContent = message;
    notice.hidden = false;

    window.clearTimeout(uploadNoticeHideTimer);
    window.clearTimeout(uploadNoticeDisplayTimer);

    window.requestAnimationFrame(() => {
        notice.classList.add('visible');
    });

    uploadNoticeHideTimer = window.setTimeout(() => {
        notice.classList.remove('visible');
        uploadNoticeDisplayTimer = window.setTimeout(() => {
            notice.hidden = true;
        }, UPLOAD_NOTICE_FADE_DURATION);
    }, UPLOAD_NOTICE_DURATION);
}

function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('invalid-file'));
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        objectUrlRegistry.add(objectUrl);

        image.onload = () => {
            resolve({ file, image, objectUrl });
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            objectUrlRegistry.delete(objectUrl);
            reject(new Error('load-failed'));
        };
        image.src = objectUrl;
    });
}

async function createPhotoEntryFromFile(file) {
    const loaded = await loadImageFile(file);
    const photo = createPhotoSource({
        file: loaded.file,
        image: loaded.image,
    });
    const extractedExif = await extractExifData(photo);
    const exifOverrideSnapshot = createEditableExifOverrideValues(extractedExif);

    return createPhotoEntry({
        ...loaded,
        photo,
        exifOverrideSnapshot,
    });
}

/**
 * 处理文件选择
 */
async function handleFileSelect(files) {
    const imageFiles = Array.from(files ?? []).filter((file) => file?.type?.startsWith('image/'));

    if (imageFiles.length === 0) {
        alert('请选择有效的图片文件');
        return;
    }

    const { acceptedFiles, duplicateNames } = filterDuplicateImageFiles(imageFiles);

    if (duplicateNames.length > 0) {
        showUploadNotice(formatDuplicateUploadNotice(duplicateNames));
    }

    if (acceptedFiles.length === 0) {
        return;
    }

    saveActivePhotoState();

    const loadedEntries = [];
    for (const file of acceptedFiles) {
        try {
            loadedEntries.push(await createPhotoEntryFromFile(file));
        } catch (error) {
            console.warn('Failed to load image file.', error);
        }
    }

    if (loadedEntries.length === 0) {
        alert('图片加载失败，请重试');
        return;
    }

    const shouldActivateFirstNewPhoto = !activePhotoId;
    photoEntries.push(...loadedEntries);

    if (shouldActivateFirstNewPhoto) {
        activatePhotoEntry(loadedEntries[0]);
        return;
    }

    renderTextEditor();
}

/**
 * 设置拖拽上传
 */
function setupDragDrop() {
    previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewArea.classList.add('drag-over');
    });

    previewArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        previewArea.classList.remove('drag-over');
    });

    previewArea.addEventListener('drop', (e) => {
        e.preventDefault();
        previewArea.classList.remove('drag-over');

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
    });
}

function bindSelectorEvents() {
    selectorList.addEventListener('click', (e) => {
        const card = e.target.closest('.template-card');
        if (!card || !selectorList.contains(card)) {
            return;
        }

        handleTemplateSelect(card.dataset.templateId);
    });
}

function bindInspectorResize() {
    if (!inspectorResizer || !textEditor) {
        return;
    }

    let startX = 0;
    let startWidth = DEFAULT_INSPECTOR_WIDTH;
    let activePointerId = null;

    const stopResize = () => {
        if (activePointerId === null) {
            return;
        }

        activePointerId = null;
        inspectorResizer.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-inspector');
    };

    inspectorResizer.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) {
            return;
        }

        e.preventDefault();
        activePointerId = e.pointerId;
        startX = e.clientX;
        startWidth = textEditor.getBoundingClientRect().width;
        inspectorResizer.setPointerCapture(e.pointerId);
        inspectorResizer.classList.add('is-dragging');
        document.body.classList.add('is-resizing-inspector');
    });

    inspectorResizer.addEventListener('pointermove', (e) => {
        if (e.pointerId !== activePointerId) {
            return;
        }

        const nextWidth = startWidth + startX - e.clientX;
        setInspectorWidth(nextWidth);
        queuePreviewResize();
    });

    inspectorResizer.addEventListener('pointerup', stopResize);
    inspectorResizer.addEventListener('pointercancel', stopResize);

    inspectorResizer.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            return;
        }

        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? 1 : -1;
        const step = e.shiftKey ? 32 : 12;
        const nextWidth = textEditor.getBoundingClientRect().width + direction * step;
        setInspectorWidth(nextWidth);
        queuePreviewResize();
    });
}

// ============================================
// 实时预览
// ============================================
async function updatePreview() {
    if (!currentImage) return;

    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    // 获取预览区容器尺寸
    const containerWidth = previewArea.clientWidth;
    const containerHeight = previewArea.clientHeight;

    await renderFrame(canvas, currentImage, template, fieldValues, {
        scale: 1,
        mode: 'preview',
        photo: currentPhoto,
        exifOverrides: exifOverrideValues,
        textModel: getTemplateTextModel(template),
    });

    const previewSize = fitInside(
        canvas.width,
        canvas.height,
        containerWidth,
        containerHeight
    );

    if (!previewSize) {
        return;
    }

    canvas.style.width = `${previewSize.width}px`;
    canvas.style.height = `${previewSize.height}px`;
}

// ============================================
// 导出下载
// ============================================
function getPhotoEntryTemplateFieldValues(entry, template) {
    if (!entry?.fieldValuesByTemplateId.has(template.id)) {
        entry.fieldValuesByTemplateId.set(template.id, loadTemplateConfig(template));
    }

    return resolveTemplateConfig(template, entry.fieldValuesByTemplateId.get(template.id));
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

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 0);
}

async function exportPhotoEntry(entry) {
    const template = getTemplateById(entry.selectedTemplateId);
    if (!template) {
        return false;
    }

    const entryFieldValues = getPhotoEntryTemplateFieldValues(entry, template);
    const entryTextModel = getPhotoEntryTextModel(entry, template);
    // 创建临时的 offscreen Canvas
    const tempCanvas = document.createElement('canvas');

    // 以原始分辨率渲染（scale = 1）
    const resize = resolveExportResize(template, entry.image, entryFieldValues);

    const renderResult = await renderFrame(tempCanvas, entry.image, template, entryFieldValues, {
        scale: 1,
        mode: 'export',
        photo: entry.photo,
        exifOverrides: entry.exifOverrideValues,
        textModel: entryTextModel,
        global: {
            resize,
            compression: {
                mimeType: exportSettings.format,
                quality: clampJpegQuality(exportSettings.jpegQuality),
            },
        },
    });

    const exportCanvas = renderResult?.processedCanvas ?? tempCanvas;
    const compression = renderResult?.global?.compression ?? {
        mimeType: DEFAULT_EXPORT_SETTINGS.format,
        quality: DEFAULT_EXPORT_SETTINGS.jpegQuality,
    };

    const blob = await canvasToBlob(exportCanvas, compression.mimeType, compression.quality);
    if (!blob) {
        return false;
    }

    downloadBlob(blob, buildExportFilename(entry.photo?.name, compression.mimeType));
    return true;
}

async function handleExport() {
    if (photoEntries.length === 0) {
        alert('请先上传照片');
        return;
    }

    saveActivePhotoState();

    const selectedEntries = photoEntries.filter((entry) => entry.selectedForExport);
    if (selectedEntries.length === 0) {
        alert('请先在批量面板选择要导出的照片');
        return;
    }

    try {
        for (const entry of selectedEntries) {
            const exported = await exportPhotoEntry(entry);
            if (!exported) {
                throw new Error('导出失败，请重试');
            }
        }
    } catch (error) {
        alert(error.message || '导出尺寸无效，请检查后重试');
    }
}

// ============================================
// 事件绑定
// ============================================
function bindEvents() {
    // 文件选择变化
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
        // 重置 input，允许重复选择同一文件
        fileInput.value = '';
    });

    // 设置拖拽上传
    setupDragDrop();
    bindSelectorEvents();
    bindInspectorResize();

    // 窗口 resize
    window.addEventListener('resize', () => {
        setInspectorWidth(textEditor.getBoundingClientRect().width);
        updatePreview();
    });

    window.addEventListener('beforeunload', () => {
        objectUrlRegistry.forEach((objectUrl) => {
            URL.revokeObjectURL(objectUrl);
        });
        objectUrlRegistry.clear();
    });
}

// ============================================
// 初始化
// ============================================
function init() {
    setInspectorWidth(DEFAULT_INSPECTOR_WIDTH);

    // 初始化 fieldValues 为默认模板的默认值
    const template = getTemplateById(selectedTemplateId);
    if (template) {
        fieldValues = getTemplateFieldValues(template);
    }

    // 渲染模板选择器
    renderSelectorList();

    // 渲染文字编辑区
    renderTextEditor();

    syncExportControls();

    // 绑定所有事件
    bindEvents();

    // 初始状态：隐藏 canvas，显示上传引导
    canvas.style.display = 'none';

    preloadRuntimeFontsInBackground()?.then(() => {
        if (currentImage) {
            updatePreview();
        }
    });
}

// 启动应用
init();
