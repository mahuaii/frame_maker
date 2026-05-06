<script setup lang="ts">
defineProps<{
    isDragging: boolean;
}>();

const emit = defineEmits<{
    upload: [files: FileList | File[]];
    dragState: [value: boolean];
}>();

function pickFiles(files: FileList | null) {
    if (files && files.length) {
        emit('upload', files);
    }
}
</script>

<template>
    <label
        class="upload-area"
        :class="{ 'is-dragging': isDragging }"
        @dragover.prevent="emit('dragState', true)"
        @dragleave.prevent="emit('dragState', false)"
        @drop.prevent="(event) => { emit('dragState', false); pickFiles(event.dataTransfer?.files ?? null); }"
    >
        <input type="file" accept="image/*" multiple hidden @change="pickFiles(($event.target as HTMLInputElement).files)" />
        <span class="upload-icon" aria-hidden="true"></span>
        <span class="upload-title">拖拽或点击上传照片</span>
        <span class="upload-hint">支持 JPG / PNG / WebP，可一次选择多张</span>
    </label>
</template>
