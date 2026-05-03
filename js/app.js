/**
 * Frame Maker 应用入口
 * 负责组装状态、控制器和全局生命周期。
 */

import { templates, getTemplateById } from './templates.js';
import { preloadRuntimeFontsInBackground } from './core/fonts/index.js';
import {
    DEFAULT_INSPECTOR_WIDTH,
    MAX_INSPECTOR_WIDTH,
    MIN_INSPECTOR_WIDTH,
    MIN_WORKSPACE_WIDTH,
} from './app/constants.js';
import { getDomRefs } from './app/dom.js';
import { createAppState } from './app/state.js';
import { createPreviewController } from './app/preview.js';
import { createTemplateSelectorController } from './app/template-selector.js';
import { createUploadController } from './app/upload.js';
import { createExportController } from './app/export.js';
import { createTextModelOperations } from './app/text-model-operations.js';
import { createInspectorController } from './app/inspector/index.js';

const dom = getDomRefs();
const state = createAppState({ templates, getTemplateById });

let previewController = null;
let templateSelectorController = null;
let uploadController = null;
let exportController = null;
let inspectorController = null;
let textModelOperations = null;

const actions = {
    renderInspector: () => inspectorController.renderInspectorPanel(),
    updatePreview: () => previewController.updatePreview(),
    queuePreviewResize: () => previewController.queuePreviewResize(),
    saveActivePhotoState: () => state.saveActivePhotoState(),
    activatePhotoEntry: (entry, options) => activatePhotoEntry(entry, options),
    updateSelectorSelection: () => templateSelectorController.updateSelectorSelection(),
    handleExport: () => exportController.handleExport(),
};

function clampInspectorWidth(width) {
    const numericWidth = Number(width);
    if (!Number.isFinite(numericWidth)) {
        return DEFAULT_INSPECTOR_WIDTH;
    }

    const viewportLimitedMax = dom.mainContent
        ? Math.max(MIN_INSPECTOR_WIDTH, dom.mainContent.clientWidth - MIN_WORKSPACE_WIDTH)
        : MAX_INSPECTOR_WIDTH;
    const maxWidth = Math.min(MAX_INSPECTOR_WIDTH, viewportLimitedMax);

    return Math.min(Math.max(Math.round(numericWidth), MIN_INSPECTOR_WIDTH), maxWidth);
}

function setInspectorWidth(width) {
    const nextWidth = clampInspectorWidth(width);
    dom.mainContent?.style.setProperty('--inspector-width', `${nextWidth}px`);
    dom.textEditor.style.setProperty('--inspector-width', `${nextWidth}px`);
    dom.inspectorResizer?.setAttribute('aria-valuemin', String(MIN_INSPECTOR_WIDTH));
    dom.inspectorResizer?.setAttribute('aria-valuemax', String(MAX_INSPECTOR_WIDTH));
    dom.inspectorResizer?.setAttribute('aria-valuenow', String(nextWidth));

    return nextWidth;
}

function activatePhotoEntry(entry, { render = true } = {}) {
    state.activatePhotoEntry(entry);

    if (!entry || !render) {
        return;
    }

    dom.canvas.style.display = 'block';
    dom.uploadGuide.style.display = 'none';
    dom.previewArea.classList.add('has-image');
    templateSelectorController.updateSelectorSelection();
    inspectorController.renderInspectorPanel();
    previewController.updatePreview();
}

function bindInspectorResize() {
    if (!dom.inspectorResizer || !dom.textEditor) {
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
        dom.inspectorResizer.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-inspector');
    };

    dom.inspectorResizer.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) {
            return;
        }

        e.preventDefault();
        activePointerId = e.pointerId;
        startX = e.clientX;
        startWidth = dom.textEditor.getBoundingClientRect().width;
        dom.inspectorResizer.setPointerCapture(e.pointerId);
        dom.inspectorResizer.classList.add('is-dragging');
        document.body.classList.add('is-resizing-inspector');
    });

    dom.inspectorResizer.addEventListener('pointermove', (e) => {
        if (e.pointerId !== activePointerId) {
            return;
        }

        const nextWidth = startWidth + startX - e.clientX;
        setInspectorWidth(nextWidth);
        previewController.queuePreviewResize();
    });

    dom.inspectorResizer.addEventListener('pointerup', stopResize);
    dom.inspectorResizer.addEventListener('pointercancel', stopResize);

    dom.inspectorResizer.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            return;
        }

        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? 1 : -1;
        const step = e.shiftKey ? 32 : 12;
        const nextWidth = dom.textEditor.getBoundingClientRect().width + direction * step;
        setInspectorWidth(nextWidth);
        previewController.queuePreviewResize();
    });
}

function createControllers() {
    previewController = createPreviewController({
        dom,
        state,
        getTemplateById,
    });
    exportController = createExportController({
        state,
        getTemplateById,
    });
    textModelOperations = createTextModelOperations({
        state,
        actions,
        getTemplateById,
    });
    inspectorController = createInspectorController({
        dom,
        state,
        actions,
        getTemplateById,
        exportController,
        textModelOperations,
    });
    templateSelectorController = createTemplateSelectorController({
        dom,
        state,
        actions,
        templates,
        getTemplateById,
    });
    uploadController = createUploadController({
        dom,
        state,
        actions,
    });
}

function bindEvents() {
    dom.fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadController.handleFileSelect(files);
        }
        dom.fileInput.value = '';
    });

    uploadController.setupDragDrop();
    templateSelectorController.bindSelectorEvents();
    bindInspectorResize();

    window.addEventListener('resize', () => {
        setInspectorWidth(dom.textEditor.getBoundingClientRect().width);
        previewController.updatePreview();
    });

    window.addEventListener('beforeunload', () => {
        state.releaseAllObjectUrls();
    });
}

function init() {
    createControllers();
    setInspectorWidth(DEFAULT_INSPECTOR_WIDTH);

    const template = getTemplateById(state.getCurrentSnapshot().selectedTemplateId);
    if (template) {
        state.setFieldValues(state.getTemplateFieldValues(template));
    }

    templateSelectorController.renderSelectorList();
    inspectorController.renderInspectorPanel();
    exportController.syncExportControls();
    bindEvents();

    dom.canvas.style.display = 'none';

    preloadRuntimeFontsInBackground()?.then(() => {
        if (state.getCurrentSnapshot().currentImage) {
            previewController.updatePreview();
        }
    });
}

init();
