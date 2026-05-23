<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { EDITABLE_EXIF_FIELDS } from '../../js/core/render/input.ts';
import { buildInspectorField } from '../adapters/inspectorFieldAdapter';
import {
    FRAME_BORDER_WIDTH_FIELD_KEY,
    FRAME_LAYOUT_FIELD_KEYS,
    FRAME_SIDE_FIELD_KEYS,
    FREE_FRAME_ASPECT_RATIO,
} from '../../js/core/templates/frame-layout.ts';
import FieldControl from './FieldControl.vue';
import ResetIconButton from './ResetIconButton.vue';
import type { FrameTemplate, TemplateField } from '../types/template';
import type { InspectorField } from '../types/inspector';

const LAYOUT_FIELD_KEYS = new Set(FRAME_LAYOUT_FIELD_KEYS);
const FRAME_SIDE_TEMPLATE_FIELD_KEYS = new Set<string>(Object.values(FRAME_SIDE_FIELD_KEYS));
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
const appearanceControlFields = computed(() => (
    appearanceFields.value.map((field) => buildInspectorField(props.template, field))
));
const aspectField = computed(() => layoutFields.value.find((field) => field.key === 'frameAspectRatio'));
const borderField = computed(() => layoutFields.value.find((field) => field.key === 'frameBorderWidth'));
const sideFields = computed(() => layoutFields.value.filter((field) => FRAME_SIDE_TEMPLATE_FIELD_KEYS.has(field.key)));
const aspectControlField = computed(() => (
    aspectField.value ? buildInspectorField(props.template, aspectField.value) : null
));
const borderControlField = computed(() => (
    borderField.value ? buildInspectorField(props.template, borderField.value) : null
));
const sideControlFields = computed(() => (
    sideFields.value.map((field) => buildInspectorField(props.template, field))
));
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
const exifFieldSections = computed(() => [
    {
        className: 'inspector-field-grid inspector-field-contained',
        fields: primaryExifFields.value,
    },
    {
        className: 'inspector-field-stack',
        fields: remainingExifFields.value,
    },
]);

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

    if (field.key === FRAME_BORDER_WIDTH_FIELD_KEY) {
        return !isFreeFrameLayout.value;
    }

    if (FRAME_SIDE_TEMPLATE_FIELD_KEYS.has(field.key)) {
        return isFreeFrameLayout.value;
    }

    return true;
}

function compactFieldLabel(field: InspectorField) {
    return COMPACT_FIELD_LABELS[field.key] ?? field.label;
}

function commitField(field: InspectorField, value: unknown) {
    emit('updateField', field.key, value);
}

function updateDraft(field: InspectorField, value: unknown) {
    if (field.type === 'text' || field.type === 'textarea') {
        textDrafts[field.key] = value;
    }

    emit('draftField', field.key, value);
}

function commitDraft(field: InspectorField) {
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
                    v-for="field in appearanceControlFields"
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
                <ResetIconButton
                    ariaLabel="重置版式"
                    title="重置版式"
                    :disabled="layoutFieldsWithDefaults.length === 0"
                    @click="emit('resetLayout')"
                />
            </header>
            <div class="inspector-section-content">
                <FieldControl
                    v-if="aspectControlField"
                    :field="aspectControlField"
                    :value="fieldValue(aspectControlField)"
                    @change="commitField"
                    @input="updateDraft"
                />
                <div v-if="isFreeFrameLayout && sideControlFields.length" class="field-group">
                    <div class="field-group-label">边界宽度</div>
                    <div class="inspector-field-grid inspector-field-contained">
                        <FieldControl
                            v-for="field in sideControlFields"
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
                <div v-else-if="borderControlField" class="field-group">
                    <div class="field-group-label">边界宽度</div>
                    <div class="inspector-field-grid inspector-field-contained">
                        <FieldControl
                            :field="borderControlField"
                            :value="fieldValue(borderControlField)"
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
                <ResetIconButton
                    ariaLabel="重置拍摄信息"
                    title="重置拍摄信息"
                    @click="emit('resetExif')"
                />
            </header>
            <div class="inspector-section-content exif-editor-content">
                <div
                    v-for="section in exifFieldSections"
                    :key="section.className"
                    :class="section.className"
                >
                    <FieldControl
                        v-for="field in section.fields"
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
