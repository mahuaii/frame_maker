/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { resolveTemplateAppearance } from './core/templates/registry.js';
import { loadTemplateConfig, saveTemplateConfig } from './core/templates/config-store.js';
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
let exifOverrideValues = {};       // Record<string, string>
let initialExifOverrideValues = {}; // 上传后预填写到表单中的 EXIF 快照
const THUMBNAIL_MAX_WIDTH = 180;
const THUMBNAIL_MAX_HEIGHT = 135;
const ASSET_VERSION = '20260419-000000';
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

    selectedTemplateId = templateId;

    // 重置 fieldValues 为新模板的默认值
    const template = getTemplateById(templateId);
    if (template) {
        fieldValues = loadTemplateConfig(template);
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
    { key: 'text', title: '文本' },
    { key: 'exif', title: '拍摄信息' },
];
const LAYOUT_FIELD_KEYS = new Set([
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
    'frameVerticalSides',
    'frameHorizontalSides',
]);
const APPEARANCE_FIELD_KEYS = new Set([
    'colorScheme',
    'showThinBorder',
]);

function renderTextEditor() {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    textEditor.innerHTML = '';
    textEditor.appendChild(createInspectorActionArea());

    const visibleFields = template.fields.filter((field) => !field.hidden);
    const fieldsBySection = groupFieldsByInspectorSection(visibleFields);

    INSPECTOR_SECTION_DEFINITIONS.forEach((definition) => {
        const section = createInspectorSection(
            definition.title,
            definition.key === 'exif' ? createExifEditorResetAllButton() : null
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

function groupFieldsByInspectorSection(fields) {
    const groups = {
        layout: [],
        appearance: [],
        text: [],
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

        groups.text.push(field);
    });

    return groups;
}

function appendFieldSectionContent(content, fields, sectionKey) {
    appendInspectorFields(content, fields, {
        values: fieldValues,
        onChange: commitFieldValue,
        compact: sectionKey === 'layout',
        getLabel: getCompactFieldLabel,
    });
}

function getCompactFieldLabel(field) {
    const compactLabels = {
        frameTop: 'T',
        frameRight: 'R',
        frameBottom: 'B',
        frameLeft: 'L',
        frameVerticalSides: 'Y',
        frameHorizontalSides: 'X',
    };

    return compactLabels[field.key] ?? field.label;
}

function commitFieldValue(field, nextValue) {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    fieldValues[field.key] = nextValue;
    fieldValues = resolveTemplateConfig(template, fieldValues);
    saveTemplateConfig(template, fieldValues);

    updatePreview();
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
    const button = createElement('button', {
        className: 'btn btn-primary btn-export-panel',
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

    button.addEventListener('click', () => {
        handleExport();
    });

    return button;
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

    actionArea.append(
        primaryActions,
        createExportControls()
    );

    return actionArea;
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
        exifOverrideValues = createEditableExifOverrideValues(extractedExif);
        initialExifOverrideValues = { ...exifOverrideValues };

        // 初始化 fieldValues（如果还没有值）
        const template = getTemplateById(selectedTemplateId);
        if (template) {
            if (Object.keys(fieldValues).length === 0) {
                fieldValues = loadTemplateConfig(template);
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
}

// ============================================
// 初始化
// ============================================
function init() {
    setInspectorWidth(DEFAULT_INSPECTOR_WIDTH);

    // 初始化 fieldValues 为默认模板的默认值
    const template = getTemplateById(selectedTemplateId);
    if (template) {
        fieldValues = loadTemplateConfig(template);
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
