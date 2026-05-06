<script setup lang="ts">
import type { FrameTemplate } from '../types/template';

defineProps<{
    template: FrameTemplate;
}>();

const emit = defineEmits<{
    importTemplate: [file: File];
    exportTemplate: [];
}>();

function pickFile(files: FileList | null) {
    const file = files?.[0];
    if (file) {
        emit('importTemplate', file);
    }
}
</script>

<template>
    <section class="panel-section template-package-actions">
        <h2>模板包</h2>
        <label class="secondary-button">
            导入模板 ZIP
            <input type="file" accept=".zip,.frame-template.zip,application/zip" hidden @change="pickFile(($event.target as HTMLInputElement).files)">
        </label>
        <button class="secondary-button" type="button" @click="emit('exportTemplate')">
            导出当前模板
        </button>
    </section>
</template>
