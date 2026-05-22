<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    checked: boolean;
    label?: string;
    ariaLabel?: string;
    title?: string;
    disabled?: boolean;
    className?: string;
    labelClassName?: string;
    inputId?: string;
    dataFieldKey?: string;
}>(), {
    label: undefined,
    ariaLabel: undefined,
    title: undefined,
    disabled: false,
    className: undefined,
    labelClassName: undefined,
    inputId: undefined,
    dataFieldKey: undefined,
});

const emit = defineEmits<{
    change: [checked: boolean];
}>();

const rootClass = computed(() => [
    'checkbox-field',
    props.className ?? '',
].filter(Boolean).join(' '));
</script>

<template>
    <label
        :class="rootClass"
        :title="title"
    >
        <input
            :id="inputId"
            type="checkbox"
            :data-field-key="dataFieldKey"
            :checked="checked"
            :disabled="disabled"
            :aria-label="ariaLabel ?? label"
            @change="emit('change', ($event.target as HTMLInputElement).checked)"
        >
        <span v-if="label" :class="labelClassName">{{ label }}</span>
    </label>
</template>
