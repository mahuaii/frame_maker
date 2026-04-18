/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { resolveTemplateAppearance } from './core/templates/registry.js';
import { loadTemplateConfig, saveTemplateConfig } from './core/templates/config-store.js';
import { isFieldVisible } from './core/templates/fields.js';
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
const ASSET_VERSION = '20260405-181900';
const DEFAULT_EXPORT_SETTINGS = {
    format: 'image/jpeg',
    sizePreset: 'original',
    customWidth: '',
    customHeight: '',
    jpegQuality: 1,
};
const MIN_JPEG_QUALITY = 0.1;
const MAX_JPEG_QUALITY = 1;
let exportSettings = { ...DEFAULT_EXPORT_SETTINGS };

// ============================================
// DOM 引用
// ============================================
const canvas = document.getElementById('preview-canvas');
const previewArea = document.getElementById('preview-area');
const uploadGuide = document.getElementById('upload-guide');
const fileInput = document.getElementById('file-input');
const btnUpload = document.getElementById('btn-upload');
const selectorList = document.getElementById('selector-list');
const textEditor = document.getElementById('text-editor');
let btnExport = null;
let exportSizePreset = null;
let exportCustomSize = null;
let exportWidthInput = null;
let exportHeightInput = null;
let exportQualityInput = null;
let exportQualityValue = null;

function clampJpegQuality(value) {
    const quality = Number(value);
    if (!Number.isFinite(quality)) {
        return DEFAULT_EXPORT_SETTINGS.jpegQuality;
    }

    return Math.min(Math.max(quality, MIN_JPEG_QUALITY), MAX_JPEG_QUALITY);
}

function parsePositiveInteger(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
        return null;
    }

    return normalized;
}

function formatJpegQualityLabel(quality) {
    return `${Math.round(clampJpegQuality(quality) * 100)}%`;
}

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

function syncJpegQualityTrack(quality) {
    if (!exportQualityInput) return;

    const normalizedQuality = clampJpegQuality(quality);
    const progress = ((normalizedQuality - MIN_JPEG_QUALITY) / (MAX_JPEG_QUALITY - MIN_JPEG_QUALITY)) * 100;
    exportQualityInput.style.setProperty('--range-progress', `${progress}%`);
}

function syncExportControls() {
    if (!exportSizePreset || !exportWidthInput || !exportHeightInput || !exportQualityInput || !exportQualityValue || !exportCustomSize) {
        return;
    }

    exportSizePreset.value = exportSettings.sizePreset;
    exportWidthInput.value = exportSettings.customWidth;
    exportHeightInput.value = exportSettings.customHeight;
    exportQualityInput.value = String(exportSettings.jpegQuality);
    exportQualityValue.textContent = formatJpegQualityLabel(exportSettings.jpegQuality);
    syncJpegQualityTrack(exportSettings.jpegQuality);
    exportCustomSize.classList.toggle('hidden', exportSettings.sizePreset !== 'custom');
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
    exportSettings = {
        ...exportSettings,
        jpegQuality: clampJpegQuality(rawValue),
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

function getPresetResizeDimensions(targetLongEdge, baseDimensions) {
    const { width, height } = baseDimensions;
    if (!targetLongEdge || !width || !height) {
        return null;
    }

    if (width >= height) {
        return {
            width: targetLongEdge,
            height: Math.max(Math.round((height / width) * targetLongEdge), 1),
        };
    }

    return {
        width: Math.max(Math.round((width / height) * targetLongEdge), 1),
        height: targetLongEdge,
    };
}

function resolveExportResize(template) {
    const baseDimensions = getBaseExportDimensions(template);

    if (exportSettings.sizePreset === 'original') {
        return null;
    }

    if (exportSettings.sizePreset === 'custom') {
        const customWidth = parsePositiveInteger(exportSettings.customWidth);
        const customHeight = parsePositiveInteger(exportSettings.customHeight);
        const widthProvided = exportSettings.customWidth !== '';
        const heightProvided = exportSettings.customHeight !== '';

        if (widthProvided && customWidth === null) {
            throw new Error('自定义宽度必须是正整数');
        }

        if (heightProvided && customHeight === null) {
            throw new Error('自定义高度必须是正整数');
        }

        if (!customWidth && !customHeight) {
            return null;
        }

        if (customWidth && customHeight) {
            return { width: customWidth, height: customHeight };
        }

        if (customWidth) {
            return {
                width: customWidth,
                height: Math.max(Math.round((baseDimensions.height / baseDimensions.width) * customWidth), 1),
            };
        }

        return {
            width: Math.max(Math.round((baseDimensions.width / baseDimensions.height) * customHeight), 1),
            height: customHeight,
        };
    }

    return getPresetResizeDimensions(Number(exportSettings.sizePreset), baseDimensions);
}

function calculateContainedSize(sourceWidth, sourceHeight, containerWidth, containerHeight, padding = 0.9) {
    if (!sourceWidth || !sourceHeight || !containerWidth || !containerHeight) {
        return null;
    }

    const maxWidth = containerWidth * padding;
    const maxHeight = containerHeight * padding;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);

    return {
        width: Math.max(Math.round(sourceWidth * scale), 1),
        height: Math.max(Math.round(sourceHeight * scale), 1),
    };
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
    { key: 'export', title: '导出' },
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
    const visibleFields = template.fields.filter((field) => !field.hidden && isFieldVisible(field, fieldValues, template));
    const fieldsBySection = groupFieldsByInspectorSection(visibleFields);

    INSPECTOR_SECTION_DEFINITIONS.forEach((definition) => {
        const section = createInspectorSection(
            definition.title,
            definition.key === 'exif' ? createExifEditorResetAllButton() : null
        );
        const content = section.querySelector('.inspector-section-content');

        switch (definition.key) {
            case 'exif':
                content.appendChild(createExifEditorContent());
                break;
            case 'export':
                content.appendChild(createExportControls());
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

function createInspectorSection(title, headerAction = null) {
    const section = document.createElement('section');
    section.className = 'inspector-section';

    const header = document.createElement('div');
    header.className = 'inspector-section-header';

    const heading = document.createElement('h2');
    heading.className = 'inspector-section-title';
    heading.textContent = title;
    header.appendChild(heading);

    if (headerAction) {
        header.appendChild(headerAction);
    }

    const content = document.createElement('div');
    content.className = 'inspector-section-content';

    section.appendChild(header);
    section.appendChild(content);

    return section;
}

function appendFieldSectionContent(content, fields, sectionKey) {
    if (!fields || fields.length === 0) {
        return;
    }

    if (sectionKey === 'layout') {
        const grid = document.createElement('div');
        grid.className = 'inspector-field-grid';
        fields.forEach((field) => {
            grid.appendChild(createFieldGroup(field, { compact: true }));
        });
        content.appendChild(grid);
        return;
    }

    fields.forEach((field) => {
        content.appendChild(createFieldGroup(field));
    });
}

function createFieldGroup(field, { compact = false } = {}) {
    const fieldGroup = document.createElement('fieldset');
    fieldGroup.className = `field-group${compact ? ' field-group-compact' : ''}`;

    const input = createFieldInput(field);

    if (field.type === 'toggle') {
        const label = document.createElement('label');
        label.className = 'checkbox-field';
        label.appendChild(input);

        if (field.label) {
            const text = document.createElement('span');
            text.textContent = field.label;
            label.appendChild(text);
        }

        fieldGroup.appendChild(label);
        return fieldGroup;
    }

    const labelText = compact ? getCompactFieldLabel(field) : field.label;
    if (labelText) {
        const label = document.createElement('label');
        label.className = 'field-group-label';
        label.textContent = labelText;
        label.htmlFor = `field-${field.key}`;
        fieldGroup.appendChild(label);
    }

    fieldGroup.appendChild(input);

    return fieldGroup;
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

function getVisibleFieldKeys(template, values) {
    return template.fields
        .filter((field) => isFieldVisible(field, values, template))
        .map((field) => field.key);
}

function commitFieldValue(field, nextValue) {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    const previousVisibleFieldKeys = getVisibleFieldKeys(template, fieldValues);

    fieldValues[field.key] = nextValue;
    fieldValues = resolveTemplateConfig(template, fieldValues);
    saveTemplateConfig(template, fieldValues);

    const nextVisibleFieldKeys = getVisibleFieldKeys(template, fieldValues);
    const didVisibleFieldsChange =
        previousVisibleFieldKeys.length !== nextVisibleFieldKeys.length
        || previousVisibleFieldKeys.some((key, index) => key !== nextVisibleFieldKeys[index]);

    if (didVisibleFieldsChange) {
        renderTextEditor();
    }

    updatePreview();
}

function syncTextareaHeight(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function createAutoSizingTextarea(field, defaultRows = 1) {
    const input = document.createElement('textarea');
    input.rows = field.rows ?? defaultRows;
    input.value = fieldValues[field.key] ?? field.defaultValue ?? '';
    input.dataset.autoResize = 'true';

    input.addEventListener('input', (e) => {
        syncTextareaHeight(input);
        commitFieldValue(field, e.target.value);
    });

    requestAnimationFrame(() => {
        syncTextareaHeight(input);
    });

    return input;
}

function formatColorOptionValue(value) {
    if (typeof value !== 'string') {
        return '000000';
    }

    const hex = value.trim().match(/^#?([0-9a-f]{6})$/i);
    if (hex) {
        return hex[1].toUpperCase();
    }

    return value.trim().toUpperCase();
}

function createFieldInput(field) {
    let input;

    switch (field.type) {
        case 'textarea': {
            input = createAutoSizingTextarea(field, 3);
            break;
        }
        case 'number': {
            input = document.createElement('input');
            input.type = 'number';
            if (field.min !== undefined) input.min = String(field.min);
            if (field.max !== undefined) input.max = String(field.max);
            if (field.step !== undefined) input.step = String(field.step);
            input.value = fieldValues[field.key] ?? field.defaultValue ?? 0;
            input.addEventListener('input', (e) => {
                commitFieldValue(field, e.target.value);
            });
            break;
        }
        case 'color': {
            input = document.createElement('input');
            input.type = 'color';
            input.value = fieldValues[field.key] ?? field.defaultValue ?? '#000000';
            input.addEventListener('input', (e) => {
                commitFieldValue(field, e.target.value);
            });
            break;
        }
        case 'select': {
            if (field.control === 'color-buttons') {
                input = document.createElement('div');
                input.className = 'option-button-group color-option-list';
                input.setAttribute('role', 'radiogroup');

                const selectedValue = fieldValues[field.key] ?? field.defaultValue ?? '';

                (field.options ?? []).forEach((option) => {
                    const swatch = option.swatch ?? '#111111';
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'option-button color-option-row' + (option.value === selectedValue ? ' selected' : '');
                    button.dataset.value = option.value;
                    button.setAttribute('role', 'radio');
                    button.setAttribute('aria-checked', option.value === selectedValue ? 'true' : 'false');
                    button.setAttribute('aria-label', option.label);
                    button.style.setProperty('--option-swatch', swatch);

                    const swatchElement = document.createElement('span');
                    swatchElement.className = 'color-option-swatch';
                    swatchElement.setAttribute('aria-hidden', 'true');

                    const valueElement = document.createElement('span');
                    valueElement.className = 'color-option-value';
                    valueElement.textContent = option.displayValue ?? formatColorOptionValue(swatch);

                    const dividerElement = document.createElement('span');
                    dividerElement.className = 'color-option-divider';
                    dividerElement.setAttribute('aria-hidden', 'true');

                    const opacityElement = document.createElement('span');
                    opacityElement.className = 'color-option-opacity';

                    const opacityValueElement = document.createElement('span');
                    opacityValueElement.className = 'color-option-opacity-value';
                    opacityValueElement.textContent = option.opacity ?? '100';

                    const opacityUnitElement = document.createElement('span');
                    opacityUnitElement.className = 'color-option-opacity-unit';
                    opacityUnitElement.textContent = '%';

                    opacityElement.append(opacityValueElement, opacityUnitElement);
                    button.append(swatchElement, valueElement, dividerElement, opacityElement);

                    button.addEventListener('click', () => {
                        const group = button.parentElement;
                        group?.querySelectorAll('.option-button').forEach((item) => {
                            const isSelected = item === button;
                            item.classList.toggle('selected', isSelected);
                            item.setAttribute('aria-checked', isSelected ? 'true' : 'false');
                        });
                        commitFieldValue(field, option.value);
                    });

                    input.appendChild(button);
                });
                break;
            }

            input = document.createElement('select');
            (field.options ?? []).forEach((option) => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                input.appendChild(optionElement);
            });
            input.value = fieldValues[field.key] ?? field.defaultValue ?? '';
            input.addEventListener('change', (e) => {
                commitFieldValue(field, e.target.value);
            });
            break;
        }
        case 'toggle': {
            const currentValue = Boolean(fieldValues[field.key] ?? field.defaultValue);
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = currentValue;
            input.addEventListener('change', () => {
                commitFieldValue(field, input.checked);
            });
            break;
        }
        case 'text':
        default: {
            input = createAutoSizingTextarea(field, 1);
            break;
        }
    }

    input.id = `field-${field.key}`;
    input.dataset.fieldKey = field.key;
    if (field.placeholder && 'placeholder' in input) {
        input.placeholder = field.placeholder;
    }

    return input;
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

function createExifEditorInput(field) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = getExifEditorFieldValue(field.key);
    input.addEventListener('input', (e) => {
        commitExifFieldValue(field.key, e.target.value);
    });
    input.id = `field-exif-${field.key}`;
    input.dataset.fieldKey = `exif-${field.key}`;
    return input;
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field-reset-button inspector-section-reset-button';
    button.setAttribute('aria-label', '重置拍摄信息');
    button.setAttribute('title', '重置拍摄信息');
    button.innerHTML = `
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.2 8a4.8 4.8 0 1 0 1.406-3.394" />
            <path d="M3.2 3.6v2.4h2.4" />
        </svg>
    `;
    button.addEventListener('click', () => {
        resetAllExifFieldValues();
    });
    return button;
}

function createExifEditorContent() {
    const content = document.createElement('div');
    content.className = 'editor-collapsible-content';

    EDITABLE_EXIF_FIELDS.forEach((field) => {
        const fieldGroup = document.createElement('fieldset');
        fieldGroup.className = 'field-group';

        const input = createExifEditorInput(field);
        const header = document.createElement('div');
        header.className = 'field-group-header';
        const label = document.createElement('label');
        label.className = 'field-group-label';
        label.textContent = field.label;
        label.htmlFor = `field-exif-${field.key}`;
        header.appendChild(label);
        fieldGroup.appendChild(header);
        fieldGroup.appendChild(input);
        content.appendChild(fieldGroup);
    });

    return content;
}

function createExportControls() {
    const controls = document.createElement('div');
    controls.className = 'export-controls';
    controls.innerHTML = `
        <fieldset class="field-group export-field export-size-field">
            <label class="field-group-label" for="export-size-preset">尺寸</label>
            <select id="export-size-preset">
                <option value="original">原始尺寸</option>
                <option value="1080">长边 1080px</option>
                <option value="2048">长边 2048px</option>
                <option value="custom">自定义</option>
            </select>
        </fieldset>
        <div class="export-custom-size hidden" id="export-custom-size">
            <fieldset class="field-group">
                <label class="field-group-label" for="export-width">W</label>
                <input type="number" id="export-width" min="1" step="1" inputmode="numeric" placeholder="宽度">
            </fieldset>
            <fieldset class="field-group">
                <label class="field-group-label" for="export-height">H</label>
                <input type="number" id="export-height" min="1" step="1" inputmode="numeric" placeholder="高度">
            </fieldset>
        </div>
        <fieldset class="field-group export-field export-quality-field">
            <label class="field-group-label" for="export-quality">JPEG 质量</label>
            <div class="export-quality-control">
                <input type="range" id="export-quality" min="0.1" max="1" step="0.01" value="1">
                <span class="export-quality-value" id="export-quality-value">100%</span>
            </div>
        </fieldset>
        <button class="btn btn-primary btn-export-panel" id="btn-export">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出 JPG
        </button>
    `;

    cacheExportControlRefs(controls);
    bindExportControlEvents();
    syncExportControls();

    return controls;
}

function cacheExportControlRefs(root = document) {
    btnExport = root.querySelector('#btn-export');
    exportSizePreset = root.querySelector('#export-size-preset');
    exportCustomSize = root.querySelector('#export-custom-size');
    exportWidthInput = root.querySelector('#export-width');
    exportHeightInput = root.querySelector('#export-height');
    exportQualityInput = root.querySelector('#export-quality');
    exportQualityValue = root.querySelector('#export-quality-value');
}

function bindExportControlEvents() {
    if (!btnExport || !exportSizePreset || !exportWidthInput || !exportHeightInput || !exportQualityInput) {
        return;
    }

    btnExport.addEventListener('click', () => {
        handleExport();
    });

    exportSizePreset.addEventListener('change', (e) => {
        setExportSizePreset(e.target.value);
    });

    exportWidthInput.addEventListener('input', (e) => {
        setCustomExportDimension('customWidth', e.target.value.trim());
    });

    exportHeightInput.addEventListener('input', (e) => {
        setCustomExportDimension('customHeight', e.target.value.trim());
    });

    exportQualityInput.addEventListener('input', (e) => {
        setJpegQuality(e.target.value);
    });
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

    const previewSize = calculateContainedSize(
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
    // 上传按钮点击
    btnUpload.addEventListener('click', () => {
        fileInput.click();
    });

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

    // 窗口 resize
    window.addEventListener('resize', () => {
        updatePreview();
    });
}

// ============================================
// 初始化
// ============================================
function init() {
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
