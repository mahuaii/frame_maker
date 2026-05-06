<script setup lang="ts">
defineProps<{
    canUndo: boolean;
    canRedo: boolean;
}>();

const emit = defineEmits<{
    undo: [];
    redo: [];
}>();
</script>

<template>
    <div class="undo-toolbar">
        <button type="button" :disabled="!canUndo" aria-label="撤销" title="撤销" @click="emit('undo')">↶</button>
        <button type="button" :disabled="!canRedo" aria-label="重做" title="重做" @click="emit('redo')">↷</button>
    </div>
</template>
