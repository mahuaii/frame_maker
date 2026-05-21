import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { calculatePreviewScale } from '../../js/core/render/metrics.ts';
import { renderTemplateFrame } from '../../js/core/render/render-template.ts';
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
            const scale = calculatePreviewScale(
                currentPhoto.image,
                currentTemplate,
                container.clientWidth,
                container.clientHeight,
                0.9,
                fieldValues.value
            );

            await renderTemplateFrame(canvas, currentPhoto.image, currentTemplate, fieldValues.value, {
                scale,
                photo: currentPhoto,
                exifOverrides: exifOverrides.value,
                textModel: textModel.value,
                mode: 'preview',
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
