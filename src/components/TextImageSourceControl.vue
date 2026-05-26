<script setup lang="ts">
import { ref } from 'vue';
import HiddenFileInput from './HiddenFileInput.vue';

const props = defineProps<{
    imageName: string;
    hasSource: boolean;
}>();

const emit = defineEmits<{
    change: [file: File];
    clear: [];
}>();

const fileInputRef = ref<InstanceType<typeof HiddenFileInput> | null>(null);

function chooseImage() {
    fileInputRef.value?.open();
}

function handleImageSelected(files: FileList) {
    const file = files[0];
    if (file) {
        emit('change', file);
    }
}
</script>

<template>
    <div class="image-source-control inspector-content-contained inspector-stack">
        <div class="field-group-label">{{ props.imageName }}</div>
        <HiddenFileInput ref="fileInputRef" accept="image/*" @change="handleImageSelected" />
        <button class="btn btn-secondary btn-inspector btn-inspector-full" type="button" @click="chooseImage">
            {{ hasSource ? '替换图片' : '选择图片' }}
        </button>
        <button class="btn btn-secondary btn-inspector btn-inspector-full" type="button" :disabled="!hasSource" @click="emit('clear')">
            清除图片
        </button>
    </div>
</template>
