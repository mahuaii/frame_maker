<script setup lang="ts">
withDefaults(defineProps<{
    ariaLabel: string;
    title?: string;
    disabled?: boolean;
}>(), {
    title: undefined,
    disabled: false,
});

const emit = defineEmits<{
    click: [];
}>();
</script>

<template>
    <button
        class="field-reset-button icon-button icon-button-sm"
        type="button"
        :aria-label="ariaLabel"
        :title="title ?? ariaLabel"
        :disabled="disabled"
        @click="emit('click')"
    >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.2 8a4.8 4.8 0 1 0 1.406-3.394"></path>
            <path d="M3.2 3.6v2.4h2.4"></path>
        </svg>
    </button>
</template>
