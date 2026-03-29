/**
 * Frame Maker 主应用逻辑
 * 串通完整用户流程：上传 → 预览 → 模板选择 → 文字编辑 → 导出
 */

import { templates, getTemplateById } from './templates.js';
import { renderFrame, calculatePreviewScale } from './renderer.js';

// ============================================
// 状态管理
// ============================================
let currentImage = null;           // HTMLImageElement | null
let selectedTemplateId = 'white';  // 默认选白底模板
let fieldValues = {};              // Record<string, string>
const THUMBNAIL_MAX_WIDTH = 180;
const THUMBNAIL_MAX_HEIGHT = 135;

// ============================================
// DOM 引用
// ============================================
const canvas = document.getElementById('preview-canvas');
const previewArea = document.getElementById('preview-area');
const uploadGuide = document.getElementById('upload-guide');
const fileInput = document.getElementById('file-input');
const btnUpload = document.getElementById('btn-upload');
const btnExport = document.getElementById('btn-export');
const selectorList = document.getElementById('selector-list');
const textEditor = document.getElementById('text-editor');

// ============================================
// 模板选择器渲染
// ============================================
function getTemplateFieldValues(template) {
    const values = {};

    template.fields.forEach(field => {
        values[field.key] = fieldValues[field.key] ?? field.defaultValue;
    });

    return values;
}

function createThumbnailElement(template) {
    if (!currentImage) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.className = 'template-thumbnail';
        thumbnailImg.alt = template.name;
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

    const fullSizeCanvas = document.createElement('canvas');
    renderFrame(
        fullSizeCanvas,
        currentImage,
        template,
        getTemplateFieldValues(template),
        1
    );

    const scale = Math.min(
        THUMBNAIL_MAX_WIDTH / fullSizeCanvas.width,
        THUMBNAIL_MAX_HEIGHT / fullSizeCanvas.height,
        1
    );
    const displayWidth = Math.round(fullSizeCanvas.width * scale);
    const displayHeight = Math.round(fullSizeCanvas.height * scale);

    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.className = 'template-thumbnail';
    thumbnailCanvas.setAttribute('aria-label', template.name);
    thumbnailCanvas.width = displayWidth;
    thumbnailCanvas.height = displayHeight;
    thumbnailCanvas.style.width = `${displayWidth}px`;
    thumbnailCanvas.style.height = `${displayHeight}px`;

    const ctx = thumbnailCanvas.getContext('2d');
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(fullSizeCanvas, 0, 0, displayWidth, displayHeight);
    }

    return thumbnailCanvas;
}

function renderSelectorList() {
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
function handleTemplateSelect(templateId) {
    if (templateId === selectedTemplateId) return;

    selectedTemplateId = templateId;

    // 重置 fieldValues 为新模板的默认值
    const template = getTemplateById(templateId);
    if (template) {
        fieldValues = {};
        template.fields.forEach(field => {
            fieldValues[field.key] = field.defaultValue;
        });
    }

    // 重新渲染选择器和编辑区
    renderSelectorList();
    renderTextEditor();

    // 更新预览
    updatePreview();
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

        const input = document.createElement('input');
        input.type = 'text';
        input.value = fieldValues[field.key] ?? field.defaultValue;
        input.dataset.fieldKey = field.key;

        // 监听输入变化
        input.addEventListener('input', (e) => {
            fieldValues[field.key] = e.target.value;
            updatePreview();
            renderSelectorList();
        });

        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        textEditor.appendChild(fieldGroup);
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

    image.onload = () => {
        currentImage = image;

        // 初始化 fieldValues（如果还没有值）
        const template = getTemplateById(selectedTemplateId);
        if (template && Object.keys(fieldValues).length === 0) {
            template.fields.forEach(field => {
                fieldValues[field.key] = field.defaultValue;
            });
            renderTextEditor();
        }

        // 显示 canvas，隐藏上传引导
        canvas.style.display = 'block';
        uploadGuide.style.display = 'none';
        previewArea.classList.add('has-image');

        // 更新模板缩略图为当前照片的实时渲染
        renderSelectorList();

        // 更新预览
        updatePreview();
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
function updatePreview() {
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
    renderFrame(canvas, currentImage, template, fieldValues, scale);
}

// ============================================
// 导出下载
// ============================================
function handleExport() {
    if (!currentImage) {
        alert('请先上传照片');
        return;
    }

    const template = getTemplateById(selectedTemplateId);
    if (!template) return;

    // 创建临时的 offscreen Canvas
    const tempCanvas = document.createElement('canvas');

    // 以原始分辨率渲染（scale = 1）
    renderFrame(tempCanvas, currentImage, template, fieldValues, 1);

    // 导出为 PNG
    tempCanvas.toBlob((blob) => {
        if (!blob) {
            alert('导出失败，请重试');
            return;
        }

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'frame_maker_export.png';

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放 URL
        URL.revokeObjectURL(url);
    }, 'image/png');
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
    btnExport.addEventListener('click', handleExport);

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
function init() {
    // 初始化 fieldValues 为默认模板的默认值
    const template = getTemplateById(selectedTemplateId);
    if (template) {
        template.fields.forEach(field => {
            fieldValues[field.key] = field.defaultValue;
        });
    }

    // 渲染模板选择器
    renderSelectorList();

    // 渲染文字编辑区
    renderTextEditor();

    // 绑定所有事件
    bindEvents();

    // 初始状态：隐藏 canvas，显示上传引导
    canvas.style.display = 'none';
}

// 启动应用
init();
