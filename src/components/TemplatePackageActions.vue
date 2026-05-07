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
    <div class="template-package-actions">
        <label class="btn inspector-template-package-button">
            导入模板
            <input type="file" accept=".zip,.frame-template.zip,application/zip" hidden @change="pickFile(($event.target as HTMLInputElement).files)">
        </label>
        <button class="btn inspector-template-package-button" type="button" @click="emit('exportTemplate')">
            导出模板
        </button>
    </div>
</template>
