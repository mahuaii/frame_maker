<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { useRenderer } from '../composables/useRenderer';
import type { PhotoEntry } from '../types/photo';
import type { FrameTemplate } from '../types/template';
import type { TextModel } from '../types/text';

const props = defineProps<{
    photo: PhotoEntry | null;
    template: FrameTemplate | null;
    fieldValues: Record<string, unknown>;
    exifOverrides: Record<string, string>;
    textModel: TextModel;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const { photo, template, fieldValues, exifOverrides, textModel } = toRefs(props);

useRenderer({
    canvasRef,
    containerRef,
    photo,
    template,
    fieldValues,
    exifOverrides,
    textModel,
});
</script>

<template>
    <section ref="containerRef" class="preview-surface">
        <canvas v-show="photo" ref="canvasRef" class="preview-canvas"></canvas>
        <div v-if="!photo" class="preview-empty">
            <span class="preview-empty-icon" aria-hidden="true"></span>
            <span>等待照片</span>
        </div>
    </section>
</template>
