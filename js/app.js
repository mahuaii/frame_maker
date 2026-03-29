/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { loadTemplateConfig, saveTemplateConfig } from './core/templates/config-store.js';
import { resolveTemplateConfig } from './core/templates/registry.js';
import { loadRuntimeFonts } from './core/fonts/index.js';
import { renderFrame, calculateFrameMetrics, calculatePreviewScale, createPhotoSource } from './renderer.js';

// ============================================
// 状态管理
// ============================================
let currentImage = null;           // HTMLImageElement | null
let currentPhoto = null;           // Normalized photo source | null
let selectedTemplateId = 'white';  // 默认选白底模板
let fieldValues = {};              // Record<string, string>
const THUMBNAIL_MAX_WIDTH = 180;
const THUMBNAIL_MAX_HEIGHT = 135;
const DEFAULT_EXPORT_SETTINGS = {
    format: 'image/jpeg',
    sizePreset: 'original',
    customWidth: '',
    customHeight: '',
    jpegQuality: 0.92,
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

function syncExportControls() {
    exportSizePreset.value = exportSettings.sizePreset;
    exportWidthInput.value = exportSettings.customWidth;
    exportHeightInput.value = exportSettings.customHeight;
    exportQualityInput.value = String(exportSettings.jpegQuality);
    exportQualityValue.textContent = formatJpegQualityLabel(exportSettings.jpegQuality);
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

function createThumbnailElement(template) {
    const thumbnailImg = document.createElement('img');
    thumbnailImg.className = 'template-thumbnail';
    thumbnailImg.alt = template.label;
    thumbnailImg.src = `thumbnails/${template.id}_thumbnail.png`;
    thumbnailImg.width = THUMBNAIL_MAX_WIDTH;
    thumbnailImg.height = THUMBNAIL_MAX_HEIGHT;
    thumbnailImg.addEventListener('error', () => {
        thumbnailImg.removeAttribute('src');
        thumbnailImg.style.background = template.backgroundColor;
        thumbnailImg.style.width = `${THUMBNAIL_MAX_WIDTH}px`;
        thumbnailImg.style.height = `${THUMBNAIL_MAX_HEIGHT}px`;
    }, { once: true });

    return thumbnailImg;
}

async function renderSelectorList() {
    selectorList.innerHTML = '';

    for (const template of templates) {
        const card = document.createElement('div');
        card.className = 'template-card' + (template.id === selectedTemplateId ? ' selected' : '');
        card.dataset.templateId = template.id;
        card.appendChild(createThumbnailElement(template));

        card.addEventListener('click', () => handleTemplateSelect(template.id));
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
    await renderSelectorList();
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

    template.fields.forEach(field => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'field-group';

        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = `field-${field.key}`;

        const input = createFieldInput(field);

        fieldGroup.appendChild(label);
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

function createFieldInput(field) {
    let input;

    switch (field.type) {
        case 'textarea': {
            input = document.createElement('textarea');
            input.rows = field.rows ?? 3;
            input.value = fieldValues[field.key] ?? field.defaultValue ?? '';
            input.addEventListener('input', (e) => {
                commitFieldValue(field, e.target.value);
            });
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
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = Boolean(fieldValues[field.key] ?? field.defaultValue);
            input.addEventListener('change', (e) => {
                commitFieldValue(field, e.target.checked);
            });
            break;
        }
        case 'text':
        default: {
            input = document.createElement('input');
            input.type = 'text';
            input.value = fieldValues[field.key] ?? field.defaultValue ?? '';
            input.addEventListener('input', (e) => {
                commitFieldValue(field, e.target.value);
            });
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

    // 计算缩放比例
    const scale = calculatePreviewScale(
        currentImage,
        template,
        containerWidth,
        containerHeight
    );

    // 渲染预览
    await renderFrame(canvas, currentImage, template, fieldValues, {
        scale,
        mode: 'preview',
        photo: currentPhoto,
    });
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

    // 预览区点击（无图片时触发上传）
    previewArea.addEventListener('click', (e) => {
        // 避免点击 canvas 时重复触发
        if (!currentImage && e.target !== canvas) {
            fileInput.click();
        }
    });

    // 设置拖拽上传
    setupDragDrop();

    // 窗口 resize
    window.addEventListener('resize', () => {
        updatePreview();
    });
}

// ============================================
// 初始化
// ============================================
async function init() {
    await loadRuntimeFonts();

    // 初始化 fieldValues 为默认模板的默认值
    const template = getTemplateById(selectedTemplateId);
    if (template) {
        fieldValues = loadTemplateConfig(template);
    }

    // 渲染模板选择器
    await renderSelectorList();

    // 渲染文字编辑区
    renderTextEditor();

    syncExportControls();

    // 绑定所有事件
    bindEvents();

    // 初始状态：隐藏 canvas，显示上传引导
    canvas.style.display = 'none';
}

// 启动应用
init();
