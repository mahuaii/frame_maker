<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { parseFieldInputValue } from '../../js/core/templates/fields.ts';
import {
    normalizeHexDraft,
    parseColorValue,
    sanitizeHexDraft,
    serializeColorValue,
} from '../utils/colorValue';
import type { InspectorField, InspectorFieldIconPath, InspectorFieldOption } from '../types/inspector';

type TextRadioPathDefinition = {
    className: string;
    d: string;
    transform?: string;
};

type IconPathDefinition = Exclude<InspectorFieldIconPath, string>;

const props = withDefaults(defineProps<{
    field: InspectorField;
    value: unknown;
    idPrefix?: string;
    compact?: boolean;
    label?: string;
    compactTitle?: string;
}>(), {
    idPrefix: 'field',
    compact: false,
    label: undefined,
    compactTitle: undefined,
});

const emit = defineEmits<{
    change: [field: InspectorField, value: unknown];
    input: [field: InspectorField, value: unknown];
}>();

const optionOpen = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const prefixedNumberInputRef = ref<HTMLInputElement | null>(null);
const colorHexDraft = ref('');
const colorAlphaDraft = ref('');
let numberDragState: {
    pointerId: number;
    startY: number;
    startValue: number;
    currentValue: number;
    lastStepOffset: number;
} | null = null;

const fieldId = computed(() => `${props.idPrefix}-${props.field.key}`);
const displayLabel = computed(() => props.label ?? props.field.label);
const fieldValue = computed(() => props.value ?? props.field.defaultValue ?? '');
const prefixIconPaths = computed(() => normalizeIconPaths(props.field.prefixIconPaths));
const dragHandlePaths = computed(() => normalizeIconPaths(props.field.dragHandlePaths ?? [
    { d: 'M6 3 3 6h6z' },
    { d: 'M6 13 3 10h6z' },
]));
const groupClass = computed(() => [
    'field-group',
    props.compact ? 'field-group-compact' : '',
    props.field.groupClassName ?? '',
].filter(Boolean).join(' '));
const inputMode = computed(() => props.field.inputMode as
    | 'text'
    | 'search'
    | 'email'
    | 'tel'
    | 'url'
    | 'none'
    | 'numeric'
    | 'decimal'
    | undefined
);

watch(() => fieldValue.value, () => {
    if (props.field.type === 'color') {
        const parsed = parseColorValue(fieldValue.value, props.field.defaultValue as string);
        colorHexDraft.value = parsed.hex;
        colorAlphaDraft.value = String(parsed.alpha);
    }
    void nextTick(syncTextareaHeight);
}, { immediate: true });

function commit(value: unknown) {
    emit('change', props.field, normalizeInputValue(value));
}

function draft(value: unknown) {
    emit('input', props.field, normalizeInputValue(value));
}

function normalizeInputValue(value: unknown) {
    if (props.field.type === 'number' || props.field.type === 'range') {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : props.field.defaultValue ?? 0;
    }

    if (props.field.type === 'toggle') {
        return Boolean(value);
    }

    return value;
}

function optionValue(option: InspectorFieldOption) {
    return String(option.value);
}

function isSelected(option: InspectorFieldOption) {
    return String(fieldValue.value) === String(option.value);
}

function formatOptionInputValue(value: unknown) {
    const matched = (props.field.options ?? []).find((option) => String(option.value) === String(value));
    if (matched) return matched.label ?? String(matched.value);
    return props.field.formatValue ? props.field.formatValue(value) : String(value ?? '');
}

function commitOptionInput(rawValue: unknown) {
    const nextValue = parseFieldInputValue(props.field as any, rawValue, fieldValue.value);
    if (nextValue === null || nextValue === undefined) {
        return;
    }
    commit(nextValue);
}

function deferCloseOptionMenu(event: FocusEvent) {
    const wrapper = event.currentTarget as HTMLElement;

    globalThis.setTimeout(() => {
        if (wrapper.contains(document.activeElement)) {
            return;
        }

        optionOpen.value = false;
    }, 0);
}

function syncTextareaHeight() {
    const textarea = textareaRef.value;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function clampNumber(value: unknown, min: number, max: number) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(Math.max(numericValue, min), max);
}

function getNumberStep() {
    const numericStep = Number(props.field.step ?? 1);
    return Number.isFinite(numericStep) && numericStep > 0 ? numericStep : 1;
}

function getNumberStepPrecision(step: number) {
    const stepText = String(step);
    const exponentMatch = stepText.match(/e-(\d+)$/i);
    if (exponentMatch) {
        return Number(exponentMatch[1]);
    }

    const decimalPart = stepText.split('.')[1];
    return decimalPart ? decimalPart.length : 0;
}

function clampFieldNumberValue(value: unknown) {
    let nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
        nextValue = Number(props.field.defaultValue ?? 0);
    }

    const min = Number(props.field.min);
    const max = Number(props.field.max);
    if (Number.isFinite(min)) {
        nextValue = Math.max(nextValue, min);
    }
    if (Number.isFinite(max)) {
        nextValue = Math.min(nextValue, max);
    }

    return nextValue;
}

function formatSteppedNumberValue(value: number, step: number) {
    const precision = Math.min(getNumberStepPrecision(step), 8);
    return String(Number(value.toFixed(precision)));
}

function normalizeIconPaths(paths: InspectorFieldIconPath[] | undefined): IconPathDefinition[] {
    return (paths ?? []).map((path) => (
        typeof path === 'string' ? { d: path } : path
    ));
}

function prefixIconTransform(path: IconPathDefinition) {
    if (!props.field.prefixIconRotation || !path.d) {
        return undefined;
    }

    return `rotate(${props.field.prefixIconRotation} ${props.field.prefixIconRotationCenter ?? '12 12'})`;
}

function dragHandleTransform(path: IconPathDefinition) {
    if (!props.field.dragHandleRotation || !path.d) {
        return undefined;
    }

    return `rotate(${props.field.dragHandleRotation} ${props.field.dragHandleRotationCenter ?? '12 12'})`;
}

function svgStrokeLinecap(path: IconPathDefinition) {
    return path.strokeLinecap as 'butt' | 'round' | 'square' | 'inherit' | undefined;
}

function svgStrokeLinejoin(path: IconPathDefinition) {
    return path.strokeLinejoin as 'round' | 'inherit' | 'miter' | 'bevel' | undefined;
}

function svgFillRule(path: IconPathDefinition) {
    return path.fillRule as 'inherit' | 'nonzero' | 'evenodd' | undefined;
}

function svgClipRule(path: IconPathDefinition) {
    return path.clipRule as 'inherit' | 'nonzero' | 'evenodd' | undefined;
}

function commitDraggedNumber(nextValue: number, event: PointerEvent) {
    const input = prefixedNumberInputRef.value;
    if (!input) {
        return;
    }

    const step = getNumberStep();
    const normalizedValue = formatSteppedNumberValue(clampFieldNumberValue(nextValue), step);
    if (input.value === normalizedValue) {
        return;
    }

    input.value = normalizedValue;
    numberDragState.currentValue = Number(normalizedValue);
    draft(normalizedValue);
    event.preventDefault();
}

function startNumberDrag(event: PointerEvent) {
    if (event.button !== 0) {
        return;
    }

    const handle = event.currentTarget as HTMLElement;
    event.preventDefault();
    numberDragState = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startValue: clampFieldNumberValue(prefixedNumberInputRef.value?.value),
        currentValue: clampFieldNumberValue(prefixedNumberInputRef.value?.value),
        lastStepOffset: 0,
    };
    handle.closest('.field-prefix-number-control')?.classList.add('is-dragging-number');
    handle.setPointerCapture?.(event.pointerId);
}

function moveNumberDrag(event: PointerEvent) {
    if (!numberDragState || event.pointerId !== numberDragState.pointerId) {
        return;
    }

    const pixelsPerStep = 2;
    const stepOffset = Math.trunc((numberDragState.startY - event.clientY) / pixelsPerStep);
    if (stepOffset === numberDragState.lastStepOffset) {
        event.preventDefault();
        return;
    }

    numberDragState.lastStepOffset = stepOffset;
    commitDraggedNumber(numberDragState.startValue + (stepOffset * getNumberStep()), event);
}

function endNumberDrag(event: PointerEvent) {
    if (!numberDragState) {
        return;
    }

    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture?.(numberDragState.pointerId)) {
        handle.releasePointerCapture(numberDragState.pointerId);
    }

    const valueToCommit = numberDragState.currentValue;
    numberDragState = null;
    handle.closest('.field-prefix-number-control')?.classList.remove('is-dragging-number');
    commit(valueToCommit);
    event.preventDefault();
}

function commitColor(hex: unknown, alpha: unknown) {
    const nextHex = normalizeHexDraft(hex, colorHexDraft.value || '000000');
    const nextAlpha = Math.round(clampNumber(alpha, 0, 100));
    colorHexDraft.value = nextHex;
    colorAlphaDraft.value = String(nextAlpha);
    commit(serializeColorValue(nextHex, nextAlpha));
}

function openColorPicker(event: MouseEvent) {
    const wrapper = (event.currentTarget as HTMLElement).closest('.color-alpha-control');
    wrapper?.querySelector<HTMLInputElement>('.color-alpha-native-input')?.click();
}

function optionSwatch(option: InspectorFieldOption) {
    const parsed = parseColorValue(option.swatch ?? '#111111');
    const alpha = option.opacity === undefined || option.opacity === ''
        ? parsed.alpha
        : Number(option.opacity) <= 1
            ? Number(option.opacity) * 100
            : Number(option.opacity);
    return serializeColorValue(parsed.hex, alpha);
}

function rangeProgress() {
    const min = Number(props.field.min ?? 0);
    const max = Number(props.field.max ?? 100);
    const current = Number(fieldValue.value);
    if (!Number.isFinite(current) || max <= min) return '0%';
    return `${Math.min(Math.max(((current - min) / (max - min)) * 100, 0), 100)}%`;
}

function textRadioPathDefinitions(control: string | undefined, value: unknown): TextRadioPathDefinition[] {
    if (control === 'text-direction-radio') {
        return [{
            className: 'text-align-radio-line',
            d: value === 'horizontal'
                ? 'M15.147 13.147a.5.5 0 0 1 .707 0l2 2a.5.5 0 0 1 0 .707l-2 2a.5.5 0 0 1-.707-.707L16.293 16H6.5l-.101-.01a.5.5 0 0 1 0-.98L6.5 15h9.793l-1.146-1.146a.5.5 0 0 1 0-.707m-5.493-7.14A1.5 1.5 0 0 1 11 7.5v2l-.007.153a1.5 1.5 0 0 1-1.34 1.34L9.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 6h2zm7 0A1.5 1.5 0 0 1 18 7.5v2l-.007.153a1.5 1.5 0 0 1-1.34 1.34L16.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L13 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L14.5 6h2zM14.5 7a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zm-7 0a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5z'
                : 'M9.654 13.008A1.5 1.5 0 0 1 11 14.5v2l-.008.153a1.5 1.5 0 0 1-1.338 1.34L9.5 18h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 16.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 13h2zM15.5 6a.5.5 0 0 1 .49.4l.01.1v9.794l1.146-1.146a.501.501 0 0 1 .708.707l-2 2a.5.5 0 0 1-.707 0l-2-2a.5.5 0 0 1 .707-.707L15 16.294V6.5l.01-.1a.5.5 0 0 1 .49-.4m-8 8a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zm2.154-7.992A1.5 1.5 0 0 1 11 7.5v2l-.008.153a1.5 1.5 0 0 1-1.338 1.34L9.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 6h2zM7.5 7a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5z',
        }];
    }

    if (control === 'text-rotation-radio') {
        return [{
            className: 'text-align-radio-line',
            d: 'M8.646 9.073a.5.5 0 0 0 .708.708L11.5 7.634v7.793a.5.5 0 0 0 1 0V7.634l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0zM6 17.927a.5.5 0 0 1 0-1h12a.5.5 0 0 1 0 1z',
            transform: `rotate(${Number(value) || 0} 12 12)`,
        }];
    }

    const alignPaths: Record<string, TextRadioPathDefinition[]> = {
        start: [
            { className: 'text-align-radio-guide', d: 'M7 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z' },
            { className: 'text-align-radio-line', d: 'M17.25 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-8a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm-4 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z' },
        ],
        center: [
            { className: 'text-align-radio-guide', d: 'M13 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z' },
            { className: 'text-align-radio-line', d: 'M17.25 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-9.5a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm-2 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z' },
        ],
        end: [
            { className: 'text-align-radio-guide', d: 'M18 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z' },
            { className: 'text-align-radio-line', d: 'M14.75 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-8a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm0 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z' },
        ],
    };

    return alignPaths[String(value)] ?? alignPaths.center;
}
</script>

<template>
    <fieldset :class="groupClass">
        <label
            v-if="field.type === 'toggle'"
            class="checkbox-field"
        >
            <input
                :id="fieldId"
                type="checkbox"
                :data-field-key="field.key"
                :checked="Boolean(fieldValue)"
                @change="commit(($event.target as HTMLInputElement).checked)"
            >
            <span v-if="displayLabel">{{ displayLabel }}</span>
        </label>

        <template v-else>
            <label
                v-if="displayLabel && !compact"
                class="field-group-label"
                :for="fieldId"
            >
                {{ displayLabel }}
            </label>
            <label
                v-if="compact && compactTitle"
                class="field-group-label"
                :for="fieldId"
            >
                {{ compactTitle }}
            </label>
            <label
                v-if="compact && displayLabel"
                class="field-prefix-control"
                :class="{ 'field-prefix-number-control': field.type === 'number' }"
            >
                <span class="field-prefix-control-label" aria-hidden="true">
                    <svg
                        v-if="prefixIconPaths.length"
                        class="field-prefix-control-icon"
                        :viewBox="field.prefixIconViewBox ?? '0 0 24 24'"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path
                            v-for="path in prefixIconPaths"
                            :key="path.d"
                            :d="path.d"
                            :fill="path.fill"
                            :stroke="path.stroke"
                            :stroke-width="path.strokeWidth"
                            :stroke-linecap="svgStrokeLinecap(path)"
                            :stroke-linejoin="svgStrokeLinejoin(path)"
                            :fill-rule="svgFillRule(path)"
                            :clip-rule="svgClipRule(path)"
                            :transform="prefixIconTransform(path)"
                        ></path>
                    </svg>
                    <template v-else>{{ displayLabel }}</template>
                </span>
                <input
                    v-if="field.type === 'number'"
                    :id="fieldId"
                    ref="prefixedNumberInputRef"
                    type="number"
                    :data-field-key="field.key"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step ?? 1"
                    :inputmode="inputMode"
                    :value="fieldValue as string | number"
                    :aria-label="displayLabel"
                    @input="draft(($event.target as HTMLInputElement).value)"
                    @change="commit(($event.target as HTMLInputElement).value)"
                >
                <svg
                    v-if="field.type === 'number'"
                    class="field-prefix-number-drag-handle"
                    :viewBox="field.dragHandleViewBox ?? '0 0 12 16'"
                    aria-hidden="true"
                    focusable="false"
                    @pointerdown="startNumberDrag"
                    @pointermove="moveNumberDrag"
                    @pointerup="endNumberDrag"
                    @pointercancel="endNumberDrag"
                >
                    <path
                        v-for="path in dragHandlePaths"
                        :key="path.d"
                        :d="path.d"
                        :fill-rule="svgFillRule(path)"
                        :clip-rule="svgClipRule(path)"
                        :transform="dragHandleTransform(path)"
                    ></path>
                </svg>
            </label>

            <textarea
                v-if="!compact && (field.type === 'text' || field.type === 'textarea')"
                :id="fieldId"
                ref="textareaRef"
                :data-field-key="field.key"
                :rows="field.rows ?? (field.type === 'textarea' ? 3 : 1)"
                :placeholder="field.placeholder"
                :value="fieldValue as string"
                data-auto-resize="true"
                @input="(event) => { syncTextareaHeight(); draft((event.target as HTMLTextAreaElement).value); }"
                @blur="commit(($event.target as HTMLTextAreaElement).value)"
                @keydown.meta.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
                @keydown.ctrl.enter.prevent="($event.target as HTMLTextAreaElement).blur()"
            ></textarea>

            <input
                v-else-if="!compact && (field.type === 'input' || field.type === 'number')"
                :id="fieldId"
                :type="field.type === 'number' ? 'number' : field.inputType ?? 'text'"
                :data-field-key="field.key"
                :min="field.min"
                :max="field.max"
                :step="field.step ?? 1"
                :inputmode="inputMode"
                :placeholder="field.placeholder"
                :value="fieldValue as string | number"
                @input="field.type === 'input' ? draft(($event.target as HTMLInputElement).value) : undefined"
                @change="commit(($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
            >

            <div
                v-else-if="field.type === 'option-input'"
                class="option-input-control"
                :class="[field.controlClassName, { 'is-open': optionOpen }]"
                @focusout="deferCloseOptionMenu"
            >
                <input
                    :id="fieldId"
                    :data-field-key="field.key"
                    :type="field.inputType ?? 'text'"
                    :inputmode="inputMode"
                    autocomplete="off"
                    :value="formatOptionInputValue(fieldValue)"
                    @focus="($event.target as HTMLInputElement).select()"
                    @change="commitOptionInput(($event.target as HTMLInputElement).value)"
                    @keydown.enter.prevent="commitOptionInput(($event.target as HTMLInputElement).value)"
                    @keydown.escape="optionOpen = false"
                >
                <button
                    class="option-input-toggle"
                    type="button"
                    aria-label="展开选项"
                    :aria-expanded="optionOpen"
                    @click="optionOpen = !optionOpen"
                ></button>
                <div class="option-input-menu" role="listbox" :hidden="!optionOpen">
                    <button
                        v-for="option in field.options ?? []"
                        :key="optionValue(option)"
                        class="option-input-option"
                        type="button"
                        role="option"
                        :aria-selected="isSelected(option)"
                        :data-value="optionValue(option)"
                        @click="() => { commit(option.value); optionOpen = false; }"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <div
                v-else-if="field.type === 'color'"
                class="color-alpha-control"
            >
                <input
                    class="color-alpha-native-input"
                    type="color"
                    tabindex="-1"
                    aria-hidden="true"
                    :value="`#${colorHexDraft}`"
                    @input="draft(serializeColorValue(($event.target as HTMLInputElement).value, colorAlphaDraft))"
                    @change="commitColor(($event.target as HTMLInputElement).value, colorAlphaDraft)"
                >
                <button
                    class="color-alpha-swatch-button"
                    type="button"
                    :aria-label="`${field.label ?? '颜色'}色板`"
                    @click="openColorPicker"
                >
                    <span
                        class="color-alpha-swatch"
                        :style="{ '--color-alpha-swatch-color': serializeColorValue(colorHexDraft, colorAlphaDraft) }"
                        aria-hidden="true"
                    ></span>
                </button>
                <input
                    class="color-alpha-hex-input"
                    type="text"
                    maxlength="6"
                    inputmode="text"
                    autocomplete="off"
                    :aria-label="`${field.label ?? '颜色'} HEX`"
                    :value="colorHexDraft"
                    @input="($event.target as HTMLInputElement).value = sanitizeHexDraft(($event.target as HTMLInputElement).value)"
                    @change="commitColor(($event.target as HTMLInputElement).value, colorAlphaDraft)"
                    @keydown.enter="commitColor(($event.target as HTMLInputElement).value, colorAlphaDraft)"
                >
                <input
                    class="color-alpha-opacity-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    inputmode="numeric"
                    :aria-label="`${field.label ?? '颜色'}不透明度`"
                    :value="colorAlphaDraft"
                    @input="draft(serializeColorValue(colorHexDraft, ($event.target as HTMLInputElement).value))"
                    @change="commitColor(colorHexDraft, ($event.target as HTMLInputElement).value)"
                >
                <span class="color-alpha-unit">%</span>
            </div>

            <div
                v-else-if="field.type === 'range'"
                class="range-control"
                :class="field.controlClassName"
            >
                <input
                    :id="fieldId"
                    type="range"
                    :data-field-key="field.key"
                    :min="field.min ?? 0"
                    :max="field.max ?? 100"
                    :step="field.step ?? 1"
                    :value="fieldValue as string | number"
                    :style="{ '--range-progress': rangeProgress() }"
                    @input="draft(($event.target as HTMLInputElement).value)"
                    @change="commit(($event.target as HTMLInputElement).value)"
                >
                <input
                    v-if="field.valueInput"
                    class="range-value-input"
                    :class="field.valueClassName"
                    type="number"
                    :min="field.min ?? 0"
                    :max="field.max ?? 100"
                    :step="field.step ?? 1"
                    :value="fieldValue as string | number"
                    @change="commit(($event.target as HTMLInputElement).value)"
                >
                <span v-else class="range-value" :class="field.valueClassName">
                    {{ field.formatValue ? field.formatValue(fieldValue) : fieldValue }}
                </span>
                <span v-if="field.valueUnit" class="range-value-unit">{{ field.valueUnit }}</span>
            </div>

            <div
                v-else-if="field.control === 'color-buttons'"
                class="option-button-group color-option-list color-option-grid"
                role="radiogroup"
            >
                <div
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    class="color-option-grid-row"
                >
                    <button
                        class="option-button color-option-row"
                        :class="{ selected: isSelected(option) }"
                        type="button"
                        role="radio"
                        :aria-checked="isSelected(option)"
                        :aria-label="option.label"
                        :title="option.label"
                        :style="{ '--option-swatch': optionSwatch(option) }"
                        @click="commit(option.value)"
                    >
                        <span class="color-option-swatch" aria-hidden="true"></span>
                        <span class="color-option-value">{{ parseColorValue(optionSwatch(option)).hex }}</span>
                        <span class="color-option-opacity">{{ parseColorValue(optionSwatch(option)).alpha }}</span>
                        <span class="color-option-unit">%</span>
                    </button>
                </div>
            </div>

            <div
                v-else-if="field.control === 'theme-radio'"
                class="option-button-group theme-radio-list"
                role="radiogroup"
                :aria-label="field.label"
            >
                <button
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    class="option-button theme-radio-button"
                    :class="{ selected: isSelected(option) }"
                    type="button"
                    role="radio"
                    :aria-checked="isSelected(option)"
                    :aria-label="option.label"
                    :title="option.label"
                    :style="{ '--theme-radio-swatch': optionSwatch(option) }"
                    @click="commit(option.value)"
                >
                    <span class="theme-radio-swatch" aria-hidden="true"></span>
                    <span class="theme-radio-label">{{ option.label }}</span>
                </button>
            </div>

            <div
                v-else-if="field.control === 'nine-grid'"
                class="nine-grid-picker"
                :class="field.controlClassName"
                role="radiogroup"
                :aria-label="field.label"
            >
                <button
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    class="nine-grid-picker-button"
                    :class="{ selected: isSelected(option) }"
                    type="button"
                    role="radio"
                    :aria-checked="isSelected(option)"
                    :aria-label="option.label"
                    :title="option.label"
                    @click="commit(option.value)"
                >
                    <svg class="nine-grid-picker-icon" viewBox="0 0 18 18" aria-hidden="true">
                        <path d="M5 5h8"></path>
                        <path d="M4 9h10"></path>
                        <path d="M6 13h6"></path>
                    </svg>
                </button>
            </div>

            <div
                v-else-if="field.control === 'frame-region'"
                class="frame-region-picker"
                :class="field.controlClassName"
                role="radiogroup"
                :aria-label="field.label"
            >
                <span class="frame-region-picker-photo" aria-hidden="true"></span>
                <button
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    class="frame-region-picker-button"
                    :class="[`frame-region-picker-${option.value}`, { selected: isSelected(option) }]"
                    type="button"
                    role="radio"
                    :aria-checked="isSelected(option)"
                    :aria-label="option.label"
                    :title="option.label"
                    @click="commit(option.value)"
                >
                    <span class="frame-region-picker-mark" aria-hidden="true"></span>
                </button>
            </div>

            <div
                v-else-if="['text-align-radio', 'text-direction-radio', 'text-rotation-radio'].includes(field.control ?? '')"
                class="text-align-radio"
                :class="[field.control === 'text-direction-radio' ? 'text-direction-radio' : '', field.control === 'text-rotation-radio' ? 'text-rotation-radio' : '', field.controlClassName]"
                role="radiogroup"
                :aria-label="field.label"
            >
                <button
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    class="option-button icon-option-button text-align-radio-button"
                    :class="{ selected: isSelected(option) }"
                    type="button"
                    role="radio"
                    :aria-checked="isSelected(option)"
                    :aria-label="option.label"
                    :title="option.label"
                    @click="commit(option.value)"
                >
                    <svg class="text-align-radio-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                            v-for="path in textRadioPathDefinitions(field.control, option.value)"
                            :key="`${path.className}-${path.d}`"
                            :class="path.className"
                            :d="path.d"
                            :transform="path.transform"
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                        ></path>
                    </svg>
                </button>
            </div>

            <select
                v-else-if="field.type === 'select'"
                :id="fieldId"
                :data-field-key="field.key"
                :value="String(fieldValue)"
                @change="commit(($event.target as HTMLSelectElement).value)"
            >
                <option
                    v-for="option in field.options ?? []"
                    :key="optionValue(option)"
                    :value="optionValue(option)"
                >
                    {{ option.label }}
                </option>
            </select>
        </template>
    </fieldset>
</template>
