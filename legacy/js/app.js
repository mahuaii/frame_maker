/**
 * Frame Maker 应用入口
 * 负责组装状态、控制器和全局生命周期。
 */

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
import { createTemplatePackageActions } from './app/template-package-actions.js';

function clampInspectorWidth(dom, width) {
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

function setInspectorWidth(dom, width) {
    const nextWidth = clampInspectorWidth(dom, width);
    dom.mainContent?.style.setProperty('--inspector-width', `${nextWidth}px`);
    dom.textEditor.style.setProperty('--inspector-width', `${nextWidth}px`);
    dom.inspectorResizer?.setAttribute('aria-valuemin', String(MIN_INSPECTOR_WIDTH));
    dom.inspectorResizer?.setAttribute('aria-valuemax', String(MAX_INSPECTOR_WIDTH));
    dom.inspectorResizer?.setAttribute('aria-valuenow', String(nextWidth));

    return nextWidth;
}

function activatePhotoEntry({
    entry,
    state,
    dom,
    templateSelectorController,
    inspectorController,
    previewController,
    render = true,
}) {
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

function bindInspectorResize({
    dom,
    previewController,
    setInspectorWidthForApp,
    cleanupCallbacks,
}) {
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

    const handlePointerDown = (e) => {
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
    };

    const handlePointerMove = (e) => {
        if (e.pointerId !== activePointerId) {
            return;
        }

        const nextWidth = startWidth + startX - e.clientX;
        setInspectorWidthForApp(nextWidth);
        previewController.queuePreviewResize();
    };

    const handleKeyDown = (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            return;
        }

        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? 1 : -1;
        const step = e.shiftKey ? 32 : 12;
        const nextWidth = dom.textEditor.getBoundingClientRect().width + direction * step;
        setInspectorWidthForApp(nextWidth);
        previewController.queuePreviewResize();
    };

    dom.inspectorResizer.addEventListener('pointerdown', handlePointerDown);
    dom.inspectorResizer.addEventListener('pointermove', handlePointerMove);
    dom.inspectorResizer.addEventListener('pointerup', stopResize);
    dom.inspectorResizer.addEventListener('pointercancel', stopResize);
    dom.inspectorResizer.addEventListener('keydown', handleKeyDown);

    cleanupCallbacks.push(() => {
        dom.inspectorResizer.removeEventListener('pointerdown', handlePointerDown);
        dom.inspectorResizer.removeEventListener('pointermove', handlePointerMove);
        dom.inspectorResizer.removeEventListener('pointerup', stopResize);
        dom.inspectorResizer.removeEventListener('pointercancel', stopResize);
        dom.inspectorResizer.removeEventListener('keydown', handleKeyDown);
    });
}

function createControllers({
    dom,
    state,
    actions,
    templates,
    getTemplateById,
    addImportedTemplate,
}) {
    const previewController = createPreviewController({
        dom,
        state,
        getTemplateById,
    });
    const exportController = createExportController({
        state,
        getTemplateById,
    });
    const textModelOperations = createTextModelOperations({
        state,
        actions,
        getTemplateById,
    });
    const inspectorController = createInspectorController({
        dom,
        state,
        actions,
        getTemplateById,
        exportController,
        textModelOperations,
        createTemplatePackageActions: () => createTemplatePackageActions({
            state,
            actions,
            getTemplateById,
            addImportedTemplate,
        }),
    });
    const templateSelectorController = createTemplateSelectorController({
        dom,
        state,
        actions,
        templates,
        getTemplateById,
    });
    const uploadController = createUploadController({
        dom,
        state,
        actions,
    });

    return {
        previewController,
        exportController,
        textModelOperations,
        inspectorController,
        templateSelectorController,
        uploadController,
    };
}

function bindEvents({
    dom,
    state,
    uploadController,
    templateSelectorController,
    previewController,
    setInspectorWidthForApp,
    cleanupCallbacks,
}) {
    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadController.handleFileSelect(files);
        }
        dom.fileInput.value = '';
    };
    const handleWindowResize = () => {
        setInspectorWidthForApp(dom.textEditor.getBoundingClientRect().width);
        previewController.updatePreview();
    };
    const handleBeforeUnload = () => {
        state.releaseAllObjectUrls();
    };

    dom.fileInput.addEventListener('change', handleFileInputChange);

    uploadController.setupDragDrop();
    templateSelectorController.bindSelectorEvents();
    bindInspectorResize({
        dom,
        previewController,
        setInspectorWidthForApp,
        cleanupCallbacks,
    });

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('beforeunload', handleBeforeUnload);

    cleanupCallbacks.push(() => {
        dom.fileInput.removeEventListener('change', handleFileInputChange);
        window.removeEventListener('resize', handleWindowResize);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        state.releaseAllObjectUrls();
    });
}

export function initFrameMakerApp({
    templates,
    getTemplates = () => templates,
    getTemplateById,
    addImportedTemplate,
}) {
    const dom = getDomRefs();
    const state = createAppState({ templates: getTemplates(), getTemplateById });
    const cleanupCallbacks = [];
    let previewController = null;
    let templateSelectorController = null;
    let uploadController = null;
    let exportController = null;
    let inspectorController = null;
    let textModelOperations = null;
    const setInspectorWidthForApp = (width) => setInspectorWidth(dom, width);
    const actions = {
        renderInspector: () => inspectorController.renderInspectorPanel(),
        updatePreview: () => previewController.updatePreview(),
        queuePreviewResize: () => previewController.queuePreviewResize(),
        saveActivePhotoState: () => state.saveActivePhotoState(),
        activatePhotoEntry: (entry, options = {}) => activatePhotoEntry({
            entry,
            state,
            dom,
            templateSelectorController,
            inspectorController,
            previewController,
            ...options,
        }),
        updateSelectorSelection: () => templateSelectorController.updateSelectorSelection(),
        renderSelectorList: () => templateSelectorController.renderSelectorList(),
        handleExport: () => exportController.handleExport(),
    };
    const controllers = createControllers({
        dom,
        state,
        actions,
        templates: getTemplates(),
        getTemplateById,
        addImportedTemplate,
    });

    previewController = controllers.previewController;
    templateSelectorController = controllers.templateSelectorController;
    uploadController = controllers.uploadController;
    exportController = controllers.exportController;
    inspectorController = controllers.inspectorController;
    textModelOperations = controllers.textModelOperations;

    setInspectorWidthForApp(DEFAULT_INSPECTOR_WIDTH);

    const template = getTemplateById(state.getCurrentSnapshot().selectedTemplateId);
    if (template) {
        state.setFieldValues(state.getTemplateFieldValues(template));
    }

    templateSelectorController.renderSelectorList();
    inspectorController.renderInspectorPanel();
    exportController.syncExportControls();
    bindEvents({
        dom,
        state,
        uploadController,
        templateSelectorController,
        previewController,
        setInspectorWidthForApp,
        cleanupCallbacks,
    });

    dom.canvas.style.display = 'none';

    preloadRuntimeFontsInBackground()?.then(() => {
        if (state.getCurrentSnapshot().currentImage) {
            previewController.updatePreview();
        }
    });

    return {
        state,
        controllers,
        destroy() {
            cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
        },
    };
}
