<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { EDITABLE_EXIF_FIELDS } from '../adapters/exifAdapter';
import type { FrameTemplate, TemplateField } from '../types/template';

const props = defineProps<{
    template: FrameTemplate;
    values: Record<string, unknown>;
    exifOverrides: Record<string, string>;
}>();

const emit = defineEmits<{
    updateField: [key: string, value: unknown];
    draftField: [key: string, value: unknown];
    updateExif: [key: string, value: string];
}>();

const textDrafts = reactive<Record<string, unknown>>({});

const visibleFields = computed(() => props.template.fields.filter((field) => !field.hidden));
const layoutFields = computed(() => visibleFields.value.filter((field) => (
    field.key.startsWith('frame')
)));
const appearanceFields = computed(() => visibleFields.value.filter((field) => (
    field.key === 'colorScheme' || field.key === 'showThinBorder'
)));
const textFields = computed(() => visibleFields.value.filter((field) => (
    !layoutFields.value.includes(field) && !appearanceFields.value.includes(field)
)));

watch(() => props.values, () => {
    Object.keys(textDrafts).forEach((key) => {
        delete textDrafts[key];
    });
}, { deep: true });

function fieldValue(field: TemplateField) {
    return textDrafts[field.key] ?? props.values[field.key] ?? field.defaultValue ?? '';
}

function commitField(field: TemplateField, value: unknown) {
    emit('updateField', field.key, value);
}

function updateDraft(field: TemplateField, value: unknown) {
    if (field.type === 'text' || field.type === 'textarea') {
        textDrafts[field.key] = value;
        emit('draftField', field.key, value);
        return;
    }

    commitField(field, value);
}

function commitDraft(field: TemplateField) {
    if (field.key in textDrafts) {
        commitField(field, textDrafts[field.key]);
        delete textDrafts[field.key];
    }
}
</script>

<template>
    <aside class="inspector-panel">
        <section class="panel-section">
            <h2>版式</h2>
            <div v-for="field in layoutFields" :key="field.key" class="field-group">
                <label :for="field.key">{{ field.label }}</label>
                <select
                    v-if="field.type === 'select' || field.type === 'option-input'"
                    :id="field.key"
                    :value="fieldValue(field) as string"
                    @change="commitField(field, ($event.target as HTMLSelectElement).value)"
                >
                    <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <input
                    v-else
                    :id="field.key"
                    type="number"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step ?? 1"
                    :value="fieldValue(field) as string"
                    @change="commitField(field, Number(($event.target as HTMLInputElement).value))"
                >
            </div>
        </section>

        <section class="panel-section">
            <h2>外观</h2>
            <div v-for="field in appearanceFields" :key="field.key" class="field-group">
                <label>{{ field.label }}</label>
                <div v-if="field.type === 'toggle'" class="toggle-row">
                    <input
                        :id="field.key"
                        type="checkbox"
                        :checked="Boolean(fieldValue(field))"
                        @change="commitField(field, ($event.target as HTMLInputElement).checked)"
                    >
                    <label :for="field.key">启用</label>
                </div>
                <div v-else class="theme-options">
                    <button
                        v-for="option in field.options ?? []"
                        :key="option.value"
                        class="theme-button"
                        :class="{ 'is-selected': fieldValue(field) === option.value }"
                        type="button"
                        :style="{ '--swatch': option.swatch ?? '#111111' }"
                        @click="commitField(field, option.value)"
                    >
                        {{ option.displayValue ?? option.label }}
                    </button>
                </div>
            </div>
        </section>

        <section v-if="textFields.length" class="panel-section">
            <h2>文本</h2>
            <div v-for="field in textFields" :key="field.key" class="field-group">
                <label :for="field.key">{{ field.label }}</label>
                <textarea
                    v-if="field.type === 'textarea'"
                    :id="field.key"
                    :value="fieldValue(field) as string"
                    @input="updateDraft(field, ($event.target as HTMLTextAreaElement).value)"
                    @blur="commitDraft(field)"
                ></textarea>
                <input
                    v-else
                    :id="field.key"
                    type="text"
                    :value="fieldValue(field) as string"
                    @input="updateDraft(field, ($event.target as HTMLInputElement).value)"
                    @blur="commitDraft(field)"
                >
            </div>
        </section>

        <section class="panel-section">
            <h2>拍摄信息</h2>
            <div v-for="field in EDITABLE_EXIF_FIELDS" :key="field.key" class="field-group">
                <label :for="`exif-${field.key}`">{{ field.label }}</label>
                <input
                    :id="`exif-${field.key}`"
                    type="text"
                    :value="exifOverrides[field.key] ?? ''"
                    @change="emit('updateExif', field.key, ($event.target as HTMLInputElement).value)"
                >
            </div>
        </section>
    </aside>
</template>
