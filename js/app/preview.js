import { fitInside } from '../core/render/sizing.js';
import { renderFrame } from '../renderer.js';

export function createPreviewController({ dom, state, getTemplateById }) {
    let pendingPreviewResize = 0;

    async function updatePreview() {
        const {
            currentImage,
            currentPhoto,
            selectedTemplateId,
            fieldValues,
            exifOverrideValues,
        } = state.getCurrentSnapshot();

        if (!currentImage) return;

        const template = getTemplateById(selectedTemplateId);
        if (!template) return;

        const containerWidth = dom.previewArea.clientWidth;
        const containerHeight = dom.previewArea.clientHeight;

        await renderFrame(dom.canvas, currentImage, template, fieldValues, {
            scale: 1,
            mode: 'preview',
            photo: currentPhoto,
            exifOverrides: exifOverrideValues,
            textModel: state.getTemplateTextModel(template),
        });

        const previewSize = fitInside(
            dom.canvas.width,
            dom.canvas.height,
            containerWidth,
            containerHeight
        );

        if (!previewSize) {
            return;
        }

        dom.canvas.style.width = `${previewSize.width}px`;
        dom.canvas.style.height = `${previewSize.height}px`;
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

    return {
        updatePreview,
        queuePreviewResize,
    };
}
