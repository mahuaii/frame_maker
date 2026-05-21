<script setup lang="ts">
import { ref } from 'vue';
import HiddenFileInput from './HiddenFileInput.vue';

const emit = defineEmits<{
    importTemplate: [file: File];
    exportTemplate: [];
}>();

const fileInputRef = ref<InstanceType<typeof HiddenFileInput> | null>(null);

function openFilePicker() {
    fileInputRef.value?.open();
}

function pickFile(files: FileList) {
    const file = files[0];
    if (file) {
        emit('importTemplate', file);
    }
}
</script>

<template>
    <div class="template-package-actions">
        <button class="btn inspector-template-package-button" type="button" @click="openFilePicker">
            导入模板
        </button>
        <HiddenFileInput
            ref="fileInputRef"
            accept=".zip,.frame-template.zip,application/zip"
            @change="pickFile"
        />
        <button class="btn inspector-template-package-button" type="button" @click="emit('exportTemplate')">
            导出模板
        </button>
    </div>
</template>
