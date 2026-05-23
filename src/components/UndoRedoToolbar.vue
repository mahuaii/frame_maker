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
        <button
            class="undo-toolbar-button icon-button icon-button-sm"
            type="button"
            :disabled="!canUndo"
            aria-label="撤销"
            title="撤销"
            @click="emit('undo')"
        >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M6 4 3 7l3 3"></path>
                <path d="M3 7h6.5a3.5 3.5 0 1 1-2.475 5.975"></path>
            </svg>
        </button>
        <button
            class="undo-toolbar-button icon-button icon-button-sm"
            type="button"
            :disabled="!canRedo"
            aria-label="重做"
            title="重做"
            @click="emit('redo')"
        >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m10 4 3 3-3 3"></path>
                <path d="M13 7H6.5a3.5 3.5 0 1 0 2.475 5.975"></path>
            </svg>
        </button>
    </div>
</template>
