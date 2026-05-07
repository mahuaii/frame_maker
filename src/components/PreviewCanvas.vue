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
    isDragging?: boolean;
}>();

const emit = defineEmits<{
    upload: [files: FileList | File[]];
    dragState: [value: boolean];
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
    <section
        ref="containerRef"
        class="preview-surface"
        :class="{ 'drag-over': isDragging }"
        @dragover.prevent="emit('dragState', true)"
        @dragleave.prevent="emit('dragState', false)"
        @drop.prevent="(event) => { emit('dragState', false); emit('upload', event.dataTransfer?.files ?? []); }"
    >
        <canvas v-show="photo" ref="canvasRef" class="preview-canvas"></canvas>
        <div v-if="!photo" class="preview-empty upload-guide">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>拖拽上传照片</p>
            <p class="upload-hint">支持 JPG / PNG / WebP 格式</p>
        </div>
    </section>
</template>
