<script setup lang="ts">
import { computed } from 'vue';
import {
    normalizeHexDraft,
    parseColorValue,
    sanitizeHexDraft,
    serializeColorValue,
} from '../utils/colorValue';

const props = withDefaults(defineProps<{
    color: string;
    label?: string;
    selected?: boolean;
    editable?: boolean;
    nativePicker?: boolean;
    tag?: 'div' | 'button';
    role?: string;
    ariaChecked?: boolean;
    ariaSelected?: boolean;
    tabindex?: string | number;
    disabled?: boolean;
    draftHexOnInput?: boolean;
}>(), {
    label: '颜色',
    selected: false,
    editable: false,
    nativePicker: false,
    tag: 'div',
    role: undefined,
    ariaChecked: undefined,
    ariaSelected: undefined,
    tabindex: undefined,
    disabled: false,
    draftHexOnInput: true,
});

const emit = defineEmits<{
    select: [];
    draft: [value: string];
    change: [value: string];
}>();

const parsedColor = computed(() => parseColorValue(props.color));
const hexValue = computed(() => parsedColor.value.hex);
const alphaValue = computed(() => String(parsedColor.value.alpha));
const serializedColor = computed(() => serializeColorValue(hexValue.value, alphaValue.value));

function draftColor(hex: unknown, alpha: unknown) {
    emit('draft', serializeColorValue(hex, alpha));
}

function commitColor(hex: unknown, alpha: unknown) {
    emit('change', serializeColorValue(normalizeHexDraft(hex, hexValue.value), alpha));
}

function handleHexInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = sanitizeHexDraft(input.value);
    if (props.draftHexOnInput) {
        draftColor(input.value, alphaValue.value);
    }
}

function handleSelect(event: Event) {
    if (props.disabled) {
        event.preventDefault();
        return;
    }
    emit('select');
}

function handleKeydown(event: KeyboardEvent) {
    if (props.tag !== 'div') {
        return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(event);
    }
}

function openColorPicker(event: MouseEvent) {
    const wrapper = (event.currentTarget as HTMLElement).closest('.color-row-control');
    wrapper?.querySelector<HTMLInputElement>('.color-row-native-input')?.click();
}
</script>

<template>
    <component
        :is="tag"
        class="color-row-control"
        :class="{ selected, 'is-editable': editable, 'has-native-picker': nativePicker }"
        :type="tag === 'button' ? 'button' : undefined"
        :role="role"
        :aria-label="label"
        :aria-checked="ariaChecked"
        :aria-selected="ariaSelected"
        :tabindex="tabindex"
        :disabled="tag === 'button' ? disabled : undefined"
        :style="{ '--color-row-swatch-color': serializedColor }"
        @click="handleSelect"
        @keydown="handleKeydown"
    >
        <input
            v-if="nativePicker"
            class="color-row-native-input"
            type="color"
            tabindex="-1"
            aria-hidden="true"
            :value="`#${hexValue}`"
            @click.stop
            @input="draftColor(($event.target as HTMLInputElement).value, alphaValue)"
            @change="commitColor(($event.target as HTMLInputElement).value, alphaValue)"
        >
        <button
            v-if="nativePicker"
            class="color-row-swatch-button"
            type="button"
            :aria-label="`${label}色板`"
            @click.stop="openColorPicker"
        >
            <span class="color-row-swatch" aria-hidden="true"></span>
        </button>
        <span v-else class="color-row-swatch" aria-hidden="true"></span>

        <template v-if="editable">
            <input
                class="color-row-input color-row-value-input"
                type="text"
                maxlength="6"
                inputmode="text"
                autocomplete="off"
                :aria-label="`${label} HEX`"
                :value="hexValue"
                @click.stop
                @input="handleHexInput"
                @change="commitColor(($event.target as HTMLInputElement).value, alphaValue)"
                @keydown.enter="commitColor(($event.target as HTMLInputElement).value, alphaValue)"
            >
            <input
                class="color-row-input color-row-opacity-input"
                type="number"
                min="0"
                max="100"
                step="1"
                inputmode="numeric"
                :aria-label="`${label}不透明度`"
                :value="alphaValue"
                @click.stop
                @input="draftColor(hexValue, ($event.target as HTMLInputElement).value)"
                @change="commitColor(hexValue, ($event.target as HTMLInputElement).value)"
            >
        </template>
        <template v-else>
            <span class="color-row-value">{{ hexValue }}</span>
            <span class="color-row-opacity">{{ alphaValue }}</span>
        </template>
        <span class="color-row-unit">%</span>
    </component>
</template>
