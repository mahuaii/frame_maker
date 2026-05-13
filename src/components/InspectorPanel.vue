<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { EDITABLE_EXIF_FIELDS } from '../adapters/exifAdapter';
import FieldControl from './FieldControl.vue';
import type { FrameTemplate, TemplateField } from '../types/template';

const FREE_FRAME_ASPECT_RATIO = 'free';
const LAYOUT_FIELD_KEYS = new Set([
    'frameAspectRatio',
    'frameBorderWidth',
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);
const FRAME_SIDE_FIELD_KEYS = new Set([
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);
const APPEARANCE_FIELD_KEYS = new Set([
    'colorScheme',
    'showThinBorder',
]);
const COMPACT_FIELD_LABELS: Record<string, string> = {
    frameTop: 'T',
    frameRight: 'R',
    frameBottom: 'B',
    frameLeft: 'L',
};
const PRIMARY_EXIF_FIELD_KEYS = ['focalLength', 'fNumber', 'exposureTime', 'iso'];

const props = defineProps<{
    template: FrameTemplate;
    values: Record<string, unknown>;
    exifOverrides: Record<string, string>;
    defaultValues: Record<string, unknown>;
}>();

const emit = defineEmits<{
    updateField: [key: string, value: unknown];
    draftField: [key: string, value: unknown];
    updateExif: [key: string, value: string];
    resetLayout: [];
    resetExif: [];
}>();

const textDrafts = reactive<Record<string, unknown>>({});

const isFreeFrameLayout = computed(() => (
    (props.values.frameAspectRatio ?? FREE_FRAME_ASPECT_RATIO) === FREE_FRAME_ASPECT_RATIO
));
const visibleFields = computed(() => props.template.fields.filter(shouldShowTemplateField));
const layoutFields = computed(() => visibleFields.value.filter((field) => LAYOUT_FIELD_KEYS.has(field.key)));
const appearanceFields = computed(() => visibleFields.value.filter((field) => APPEARANCE_FIELD_KEYS.has(field.key)));
const aspectField = computed(() => layoutFields.value.find((field) => field.key === 'frameAspectRatio'));
const borderField = computed(() => layoutFields.value.find((field) => field.key === 'frameBorderWidth'));
const sideFields = computed(() => layoutFields.value.filter((field) => FRAME_SIDE_FIELD_KEYS.has(field.key)));
const layoutFieldsWithDefaults = computed(() => (
    layoutFields.value.filter((field) => props.defaultValues[field.key] !== undefined)
));
const primaryExifFields = computed(() => PRIMARY_EXIF_FIELD_KEYS
    .map((fieldKey) => EDITABLE_EXIF_FIELDS.find((field) => field.key === fieldKey))
    .filter((field): field is typeof EDITABLE_EXIF_FIELDS[number] => Boolean(field))
);
const remainingExifFields = computed(() => EDITABLE_EXIF_FIELDS.filter((field) => (
    !PRIMARY_EXIF_FIELD_KEYS.includes(field.key)
)));

watch(() => props.values, () => {
    Object.keys(textDrafts).forEach((key) => {
        delete textDrafts[key];
    });
}, { deep: true });

function fieldValue(field: TemplateField) {
    return textDrafts[field.key] ?? props.values[field.key] ?? field.defaultValue ?? '';
}

function shouldShowTemplateField(field: TemplateField) {
    if (field.hidden) {
        return false;
    }

    if (field.key === 'frameBorderWidth') {
        return !isFreeFrameLayout.value;
    }

    if (FRAME_SIDE_FIELD_KEYS.has(field.key)) {
        return isFreeFrameLayout.value;
    }

    return true;
}

function compactFieldLabel(field: TemplateField) {
    return COMPACT_FIELD_LABELS[field.key] ?? field.label;
}

function commitField(field: TemplateField, value: unknown) {
    emit('updateField', field.key, value);
}

function updateDraft(field: TemplateField, value: unknown) {
    if (field.type === 'text' || field.type === 'textarea') {
        textDrafts[field.key] = value;
    }

    emit('draftField', field.key, value);
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
        <section class="inspector-section">
            <div class="inspector-section-header">
                <h2 class="inspector-section-title">外观</h2>
            </div>
            <div class="inspector-section-content">
                <FieldControl
                    v-for="field in appearanceFields"
                    :key="field.key"
                    :field="field"
                    :value="fieldValue(field)"
                    @change="commitField"
                    @input="updateDraft"
                />
            </div>
        </section>

        <section class="inspector-section">
            <header class="inspector-section-header">
                <h2 class="inspector-section-title">版式</h2>
                <button
                    class="field-reset-button inspector-section-reset-button"
                    type="button"
                    aria-label="重置版式"
                    title="重置版式"
                    :disabled="layoutFieldsWithDefaults.length === 0"
                    @click="emit('resetLayout')"
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M3.2 8a4.8 4.8 0 1 0 1.406-3.394"></path>
                        <path d="M3.2 3.6v2.4h2.4"></path>
                    </svg>
                </button>
            </header>
            <div class="inspector-section-content">
                <FieldControl
                    v-if="aspectField"
                    :field="aspectField"
                    :value="fieldValue(aspectField)"
                    @change="commitField"
                    @input="updateDraft"
                />
                <div v-if="isFreeFrameLayout && sideFields.length" class="field-group">
                    <div class="field-group-label">边界宽度</div>
                    <div class="inspector-field-grid inspector-field-grid-contained">
                        <FieldControl
                            v-for="field in sideFields"
                            :key="field.key"
                            :field="field"
                            :value="fieldValue(field)"
                            :label="compactFieldLabel(field)"
                            compact
                            @change="commitField"
                            @input="updateDraft"
                        />
                    </div>
                </div>
                <div v-else-if="borderField" class="field-group">
                    <div class="field-group-label">边界宽度</div>
                    <div class="inspector-field-grid inspector-field-grid-contained">
                        <FieldControl
                            :field="borderField"
                            :value="fieldValue(borderField)"
                            compact
                            @change="commitField"
                            @input="updateDraft"
                        />
                    </div>
                </div>
            </div>
        </section>

        <section class="inspector-section">
            <header class="inspector-section-header">
                <h2 class="inspector-section-title">拍摄信息</h2>
                <button
                    class="field-reset-button inspector-section-reset-button"
                    type="button"
                    aria-label="重置拍摄信息"
                    title="重置拍摄信息"
                    @click="emit('resetExif')"
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M3.2 8a4.8 4.8 0 1 0 1.406-3.394"></path>
                        <path d="M3.2 3.6v2.4h2.4"></path>
                    </svg>
                </button>
            </header>
            <div class="inspector-section-content exif-editor-content">
                <div class="inspector-field-grid inspector-field-grid-contained">
                    <FieldControl
                        v-for="field in primaryExifFields"
                        :key="field.key"
                        :field="{ ...field, type: field.type ?? 'input', defaultValue: '' }"
                        :value="exifOverrides[field.key] ?? ''"
                        id-prefix="field-exif"
                        @change="(_, value) => emit('updateExif', field.key, String(value ?? ''))"
                    />
                </div>
                <div class="editor-collapsible-content">
                    <FieldControl
                        v-for="field in remainingExifFields"
                        :key="field.key"
                        :field="{ ...field, type: field.type ?? 'input', defaultValue: '' }"
                        :value="exifOverrides[field.key] ?? ''"
                        id-prefix="field-exif"
                        @change="(_, value) => emit('updateExif', field.key, String(value ?? ''))"
                    />
                </div>
            </div>
        </section>
    </aside>
</template>
