/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { FREE_FRAME_ASPECT_RATIO } from './core/templates/frame-layout.js';
import { resolveTemplateAppearance } from './core/templates/registry.js';
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
const templateFieldValuesById = new Map(); // Map<string, Record<string, string>>
let exifOverrideValues = {};       // Record<string, string>
let initialExifOverrideValues = {}; // 上传后预填写到表单中的 EXIF 快照
let activeInspectorPanel = 'basic';
let selectedTextObjectId = null;
const textModelsByTemplateId = new Map();
const objectUrlRegistry = new Set();
const THUMBNAIL_MAX_WIDTH = 180;
const THUMBNAIL_MAX_HEIGHT = 135;
const ASSET_VERSION = '20260425-000000';
const DEFAULT_INSPECTOR_WIDTH = 276;
const MIN_INSPECTOR_WIDTH = 220;
const MAX_INSPECTOR_WIDTH = 520;
const MIN_WORKSPACE_WIDTH = 320;
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

function getBaseExportDimensions(template) {
    const metrics = calculateFrameMetrics(currentImage, template, 1, fieldValues);
    return {
        width: metrics.fullWidth,
        height: metrics.fullHeight,
    };
}

function resolveExportResize(template) {
    return resolveResizeDimensions({
        sizePreset: exportSettings.sizePreset,
        customWidth: exportSettings.customWidth,
        customHeight: exportSettings.customHeight,
        baseDimensions: getBaseExportDimensions(template),
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
    }

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
    if (!template) return;

    closeActiveExportMenu?.();
    textEditor.innerHTML = '';
    textEditor.appendChild(createInspectorActionArea());

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

    if (field.key === 'frameAspectRatio') {
        renderTextEditor();
    }

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

function getTextObjectTypeLabel(item) {
    const labels = {
        group: '组',
        text: '文',
        separator: '线',
        image: '图',
    };

    return labels[item?.type] ?? '?';
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

function commitTextModelChange(template, mutate) {
    const textModel = getTemplateTextModel(template);
    mutate(textModel);
    setTemplateTextModel(template, textModel);
    ensureSelectedTextObject(template);
    renderTextEditor();
    updatePreview();
}

function createTextModelEditorPanel(template) {
    ensureSelectedTextObject(template);

    const section = createInspectorSection('文本', createIconButton({
        className: 'field-reset-button inspector-section-reset-button',
        label: '重置文本',
        iconPaths: RESET_ICON_PATHS,
        onClick: resetCurrentTemplateTextModel,
    }));
    const content = getInspectorSectionContent(section);
    const editor = createElement('div', {
        className: 'text-model-editor',
        children: [
            createTextObjectTree(template),
            createSelectedTextObjectPanel(template),
        ],
    });

    content.appendChild(editor);

    return section;
}

function createTextObjectTree(template) {
    const textModel = getTemplateTextModel(template);
    const header = createElement('div', {
        className: 'text-object-tree-header',
        children: [
            createElement('span', { textContent: '组 / 项' }),
            createElement('button', {
                className: 'btn-small text-object-add-button',
                textContent: '新增文本组',
                attributes: { type: 'button' },
            }),
        ],
    });
    const addButton = header.querySelector('button');
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
        className: 'text-object-tree',
        children: [header, list],
    });
}

function createTextObjectTreeNode(template, item, depth) {
    const isSelected = item.id === selectedTextObjectId;
    const node = createElement('div', {
        className: `text-object-node${isSelected ? ' selected' : ''}`,
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
                textContent: item.label || getTextObjectTypeLabel(item),
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
            className: 'text-object-properties text-object-empty',
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
    const actions = createElement('div', {
        className: 'text-object-action-bar',
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
                commitTextModelChange(template, () => {
                    const nextItem = createDefaultTextItem(type);
                    item.items = Array.isArray(item.items) ? item.items : [];
                    item.items.push(nextItem);
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
            commitTextModelChange(template, () => {
                const nextIndex = index + direction;
                const [movedItem] = siblings.splice(index, 1);
                siblings.splice(nextIndex, 0, movedItem);
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
        commitTextModelChange(template, () => {
            releaseTextModelObjectUrls([item]);
            siblings.splice(index, 1);
            selectedTextObjectId = siblings[Math.min(index, siblings.length - 1)]?.id
                ?? selected.parent?.id
                ?? null;
        });
    });
    actions.appendChild(deleteButton);

    return actions;
}

function createTextObjectFields(template, selected) {
    const { item, depth } = selected;
    const fields = buildTextObjectFieldDefinitions(item, depth);
    const values = buildTextObjectFieldValues(item, fields);
    const list = createInspectorFieldList(fields, {
        values,
        idPrefix: `text-object-${item.id}`,
        onChange: (field, nextValue) => {
            commitTextObjectFieldValue(template, item, field.key, nextValue);
        },
    });

    if (item.type === 'image') {
        list.appendChild(createImageSourceControl(template, item));
    }

    return list;
}

function buildTextObjectFieldDefinitions(item, depth) {
    const commonFields = [
        { key: 'label', label: '名称', type: 'input', defaultValue: '' },
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
        { key: 'style.colorToken', label: '颜色 token', type: 'input', defaultValue: 'textPrimary' },
        { key: 'style.color', label: '自定义颜色', type: 'color', defaultValue: '#111111' },
        { key: 'style.letterSpacingScale', label: '字距倍率', type: 'number', step: 0.01, defaultValue: 0 },
    ];

    if (item.type === 'group') {
        return [
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
        ];
    }

    if (item.type === 'text') {
        return [
            ...commonFields,
            { key: 'content', label: '内容', type: 'textarea', defaultValue: '' },
            {
                key: 'emptyBehavior',
                label: '空值行为',
                type: 'select',
                defaultValue: 'hide',
                options: [
                    { value: 'hide', label: '隐藏' },
                    { value: 'fallback', label: '使用 fallback' },
                    { value: 'show', label: '保留' },
                ],
            },
            { key: 'fallbackContent', label: 'fallback 内容', type: 'textarea', defaultValue: '' },
            ...styleFields,
        ];
    }

    if (item.type === 'separator') {
        return [
            ...commonFields,
            { key: 'forceVisible', label: '强制显示', type: 'toggle', defaultValue: false },
            { key: 'lengthScale', label: '长度倍率', type: 'number', min: 0.1, step: 0.05, defaultValue: 1.4 },
            { key: 'thicknessScale', label: '粗细倍率', type: 'number', min: 0.01, step: 0.01, defaultValue: 0.06 },
            { key: 'colorToken', label: '颜色 token', type: 'input', defaultValue: 'separator' },
            { key: 'color', label: '自定义颜色', type: 'color', defaultValue: '#9CA3AF' },
        ];
    }

    return commonFields;
}

function buildTextObjectFieldValues(item, fields) {
    return fields.reduce((values, field) => {
        values[field.key] = getPathValue(item, field.key) ?? field.defaultValue ?? '';
        return values;
    }, {});
}

function commitTextObjectFieldValue(template, item, fieldKey, nextValue) {
    commitTextModelChange(template, () => {
        setPathValue(item, fieldKey, nextValue);
    });
}

function createImageSourceControl(template, item) {
    const wrapper = createElement('div', {
        className: 'image-source-control',
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
        commitTextModelChange(template, () => {
            releaseTextModelObjectUrls([item]);
            item.source = {
                type: 'objectUrl',
                src: objectUrl,
                name: file.name,
            };
        });
    });
    clearButton.addEventListener('click', () => {
        commitTextModelChange(template, () => {
            releaseTextModelObjectUrls([item]);
            item.source = null;
        });
    });

    wrapper.append(label, input, chooseButton, clearButton);
    return wrapper;
}

// ============================================
// 图片上传处理
// ============================================

/**
 * 处理文件选择
 */
function handleFileSelect(file) {
    // 校验文件类型
    if (!file || !file.type.startsWith('image/')) {
        alert('请选择有效的图片文件');
        return;
    }

    const image = new Image();
    image.src = URL.createObjectURL(file);

    image.onload = async () => {
        currentImage = image;
        currentPhoto = createPhotoSource({ file, image });
        const extractedExif = await extractExifData(currentPhoto);
        const nextInitialExifOverrideValues = createEditableExifOverrideValues(extractedExif);
        const shouldInitializeExifOverrides = Object.keys(exifOverrideValues).length === 0;
        initialExifOverrideValues = { ...nextInitialExifOverrideValues };

        if (shouldInitializeExifOverrides) {
            exifOverrideValues = { ...nextInitialExifOverrideValues };
        }

        // 初始化 fieldValues（如果还没有值）
        const template = getTemplateById(selectedTemplateId);
        if (template) {
            if (Object.keys(fieldValues).length === 0) {
                fieldValues = getTemplateFieldValues(template);
            }
            renderTextEditor();
        }

        // 显示 canvas，隐藏上传引导
        canvas.style.display = 'block';
        uploadGuide.style.display = 'none';
        previewArea.classList.add('has-image');

        // 更新预览
        await updatePreview();
    };

    image.onerror = () => {
        alert('图片加载失败，请重试');
    };
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
            handleFileSelect(files[0]);
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
async function handleExport() {
    if (!currentImage) {
        alert('请先上传照片');
        return;
    }

    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    // 创建临时的 offscreen Canvas
    const tempCanvas = document.createElement('canvas');

    // 以原始分辨率渲染（scale = 1）
    let resize;

    try {
        resize = resolveExportResize(template);
    } catch (error) {
        alert(error.message || '导出尺寸无效，请检查后重试');
        return;
    }

    const renderResult = await renderFrame(tempCanvas, currentImage, template, fieldValues, {
        scale: 1,
        mode: 'export',
        photo: currentPhoto,
        exifOverrides: exifOverrideValues,
        textModel: getTemplateTextModel(template),
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

    exportCanvas.toBlob((blob) => {
        if (!blob) {
            alert('导出失败，请重试');
            return;
        }

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = buildExportFilename(currentPhoto?.name, compression.mimeType);

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放 URL
        URL.revokeObjectURL(url);
    }, compression.mimeType, compression.quality);
}

// ============================================
// 事件绑定
// ============================================
function bindEvents() {
    // 文件选择变化
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
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
