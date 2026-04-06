/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { resolveTemplateAppearance } from './core/templates/registry.js';
import { loadTemplateConfig, saveTemplateConfig } from './core/templates/config-store.js';
import { resolveTemplateConfig } from './core/templates/registry.js';
import { preloadRuntimeFontsInBackground } from './core/fonts/index.js';
import { renderFrame, calculateFrameMetrics, createPhotoSource } from './renderer.js';

// ============================================
// 状态管理
// ============================================
let currentImage = null;           // HTMLImageElement | null
let currentPhoto = null;           // Normalized photo source | null
let selectedTemplateId = 'classic-frame';  // 默认选经典相框模板
let fieldValues = {};              // Record<string, string>
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
const btnExport = document.getElementById('btn-export');
const exportSizePreset = document.getElementById('export-size-preset');
const exportCustomSize = document.getElementById('export-custom-size');
const exportWidthInput = document.getElementById('export-width');
const exportHeightInput = document.getElementById('export-height');
const exportQualityInput = document.getElementById('export-quality');
const exportQualityValue = document.getElementById('export-quality-value');
const selectorList = document.getElementById('selector-list');
const textEditor = document.getElementById('text-editor');

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

function syncJpegQualityTrack(quality) {
    const normalizedQuality = clampJpegQuality(quality);
    const progress = ((normalizedQuality - MIN_JPEG_QUALITY) / (MAX_JPEG_QUALITY - MIN_JPEG_QUALITY)) * 100;
    exportQualityInput.style.setProperty('--range-progress', `${progress}%`);
}

function syncExportControls() {
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
    const metrics = calculateFrameMetrics(currentImage, template, 1);
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
    thumbnailImg.alt = template.label;
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
function renderTextEditor() {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    textEditor.innerHTML = '';
    const orderedFields = [
        ...template.fields.filter((field) => field.type !== 'toggle'),
        ...template.fields.filter((field) => field.type === 'toggle'),
    ];

    orderedFields.forEach(field => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'field-group';

        const input = createFieldInput(field);

        if (field.type !== 'toggle') {
            const label = document.createElement('label');
            label.textContent = field.label;
            label.htmlFor = `field-${field.key}`;
            fieldGroup.appendChild(label);
        }
        fieldGroup.appendChild(input);
        textEditor.appendChild(fieldGroup);
    });
}

function commitFieldValue(field, nextValue) {
    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    fieldValues[field.key] = nextValue;
    fieldValues = resolveTemplateConfig(template, fieldValues);
    saveTemplateConfig(template, fieldValues);
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
                input.className = 'option-button-group';
                input.setAttribute('role', 'radiogroup');

                const selectedValue = fieldValues[field.key] ?? field.defaultValue ?? '';

                (field.options ?? []).forEach((option) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'option-button' + (option.value === selectedValue ? ' selected' : '');
                    button.dataset.value = option.value;
                    button.setAttribute('role', 'radio');
                    button.setAttribute('aria-checked', option.value === selectedValue ? 'true' : 'false');
                    button.setAttribute('aria-label', option.label);
                    button.style.setProperty('--option-swatch', option.swatch ?? '#111111');

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
            input = document.createElement('button');
            input.type = 'button';
            input.className = 'toggle-pill' + (currentValue ? ' is-active' : '');
            input.setAttribute('role', 'switch');
            input.setAttribute('aria-checked', currentValue ? 'true' : 'false');
            const text = document.createElement('span');
            text.className = 'toggle-pill-text';
            text.textContent = field.label;
            input.appendChild(text);
            input.addEventListener('click', () => {
                const nextValue = input.getAttribute('aria-checked') !== 'true';
                input.classList.toggle('is-active', nextValue);
                input.setAttribute('aria-checked', nextValue ? 'true' : 'false');
                commitFieldValue(field, nextValue);
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

        // 初始化 fieldValues（如果还没有值）
        const template = getTemplateById(selectedTemplateId);
        if (template && Object.keys(fieldValues).length === 0) {
            fieldValues = loadTemplateConfig(template);
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

function setupSelectorScroll() {
    selectorList.addEventListener('wheel', (e) => {
        const canScrollHorizontally = selectorList.scrollWidth > selectorList.clientWidth;
        if (!canScrollHorizontally) {
            return;
        }

        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) {
            return;
        }

        selectorList.scrollLeft += delta;
        e.preventDefault();
    }, { passive: false });
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
        link.download = 'frame_maker_export.jpg';

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

    // 导出按钮点击
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
    setupSelectorScroll();
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
