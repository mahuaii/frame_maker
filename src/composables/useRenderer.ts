import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { renderPreviewCanvas } from '../adapters/rendererAdapter';
import type { PhotoEntry } from '../types/photo';
import type { FrameTemplate } from '../types/template';
import type { TextModel } from '../types/text';

export function useRenderer({
    canvasRef,
    containerRef,
    photo,
    template,
    fieldValues,
    exifOverrides,
    textModel,
}: {
    canvasRef: Ref<HTMLCanvasElement | null>;
    containerRef: Ref<HTMLElement | null>;
    photo: Ref<PhotoEntry | null>;
    template: Ref<FrameTemplate | null>;
    fieldValues: Ref<Record<string, unknown>>;
    exifOverrides: Ref<Record<string, string>>;
    textModel: Ref<TextModel>;
}) {
    const isRendering = ref(false);
    let resizeObserver: ResizeObserver | null = null;

    async function render() {
        await nextTick();

        const canvas = canvasRef.value;
        const container = containerRef.value;
        const currentPhoto = photo.value;
        const currentTemplate = template.value;

        if (!canvas || !container || !currentPhoto || !currentTemplate) {
            return;
        }

        isRendering.value = true;
        try {
            await renderPreviewCanvas({
                canvas,
                photo: currentPhoto,
                template: currentTemplate,
                fieldValues: fieldValues.value,
                exifOverrides: exifOverrides.value,
                textModel: textModel.value,
                container,
            });
        } finally {
            isRendering.value = false;
        }
    }

    watch([photo, template, fieldValues, exifOverrides, textModel], render, {
        deep: true,
        immediate: true,
    });

    watch(containerRef, (container) => {
        resizeObserver?.disconnect();
        if (!container) return;

        resizeObserver = new ResizeObserver(() => {
            void render();
        });
        resizeObserver.observe(container);
    }, {
        immediate: true,
    });

    onBeforeUnmount(() => {
        resizeObserver?.disconnect();
    });

    return {
        isRendering,
        render,
    };
}
