<script setup lang="ts">
import { ref } from 'vue';

withDefaults(defineProps<{
    accept: string;
    multiple?: boolean;
}>(), {
    multiple: false,
});

const emit = defineEmits<{
    change: [files: FileList];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function open() {
    inputRef.value?.click();
}

function handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length) {
        emit('change', files);
    }

    input.value = '';
}

defineExpose({
    open,
});
</script>

<template>
    <input
        ref="inputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        hidden
        @change="handleChange"
    >
</template>
