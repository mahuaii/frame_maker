<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { EDITABLE_EXIF_FIELDS } from '../../js/core/render/input.ts';
import { APPEARANCE_COLOR_CONFIGS } from '../../js/core/templates/appearance.ts';
import { buildInspectorField } from '../adapters/inspectorFieldAdapter';
import {
    FRAME_BORDER_WIDTH_FIELD_KEY,
    FRAME_LAYOUT_FIELD_KEYS,
    FRAME_SIDE_FIELD_KEYS,
    FREE_FRAME_ASPECT_RATIO,
} from '../../js/core/templates/frame-layout.ts';
import InspectorFieldRows from './InspectorFieldRows.vue';
import InspectorSection from './InspectorSection.vue';
import ResetIconButton from './ResetIconButton.vue';
import type { FrameTemplate, TemplateField } from '../types/template';
import type { InspectorField } from '../types/inspector';
import type { InspectorFieldRow } from '../types/inspectorRows';

type AppearanceColorControl = {
    field: InspectorField;
    value: string;
};

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
const APPEARANCE_COLOR_TOKEN_LABELS: Record<string, string> = {
    appearanceBackgroundColor: '背景',
    appearanceBackgroundOverlayColor: '叠加',
    appearancePhotoBorderColor: '内边框',
    appearanceBarBackgroundColor: '信息栏',
};

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
const appearanceColorControls = computed(() => buildAppearanceColorControls());
const appearanceFieldRows = computed<InspectorFieldRow[]>(() => [
    ...appearanceControlFields.value.map((field) => buildSingleFieldRow(field)),
    ...appearanceColorControls.value.map((control) => buildSingleFieldRow(control.field)),
]);
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
const layoutFieldRows = computed<InspectorFieldRow[]>(() => {
    const rows: InspectorFieldRow[] = [];
    if (aspectControlField.value) {
        rows.push(buildSingleFieldRow(aspectControlField.value));
    }
    if (isFreeFrameLayout.value) {
        rows.push(...sideControlRows.value.map((row) => buildDoubleFieldRow(row)));
    } else if (borderControlField.value) {
        rows.push(buildSingleFieldRow(borderControlField.value));
    }
    return rows;
});
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
const sideControlRows = computed(() => [
    pickFieldsByKey(sideControlFields.value, [FRAME_SIDE_FIELD_KEYS.top, FRAME_SIDE_FIELD_KEYS.bottom]),
    pickFieldsByKey(sideControlFields.value, [FRAME_SIDE_FIELD_KEYS.left, FRAME_SIDE_FIELD_KEYS.right]),
].filter((row) => row.length > 0));
const exifFieldRows = computed(() => [
    pickFieldsByKey(primaryExifFields.value, ['focalLength', 'fNumber']),
    pickFieldsByKey(primaryExifFields.value, ['exposureTime', 'iso']),
    ...remainingExifFields.value.map((field) => [field]),
].filter((row) => row.length > 0).map((row) => ({
    id: fieldRowKey(row),
    type: row.length > 1 ? 'double' as const : 'single' as const,
    fields: row.map((field) => ({ ...field, type: field.type ?? 'input', defaultValue: '' })),
})));

watch(() => props.values, () => {
    Object.keys(textDrafts).forEach((key) => {
        delete textDrafts[key];
    });
}, { deep: true });

function fieldValue(field: Pick<TemplateField, 'key' | 'defaultValue'>) {
    return textDrafts[field.key] ?? props.values[field.key] ?? field.defaultValue ?? '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getAppearanceFieldKey() {
    return props.template.appearanceFieldKey ?? 'colorScheme';
}

function getActiveAppearanceTheme() {
    const themes = props.template.appearanceThemes ?? {};
    const fallbackKey = props.template.appearanceDefaultKey ?? Object.keys(themes)[0];
    const requestedKey = props.values[getAppearanceFieldKey()];
    const themeKey = typeof requestedKey === 'string' && Object.hasOwn(themes, requestedKey)
        ? requestedKey
        : fallbackKey;

    return themes[themeKey] ?? null;
}

function getThemeColorDefault(colorConfig: typeof APPEARANCE_COLOR_CONFIGS[number], theme: NonNullable<ReturnType<typeof getActiveAppearanceTheme>>) {
    if ('section' in colorConfig) {
        return theme.canvasBackground?.[colorConfig.token];
    }

    return theme.colors?.[colorConfig.group]?.[colorConfig.token];
}

function buildAppearanceColorControls(): AppearanceColorControl[] {
    const theme = getActiveAppearanceTheme();
    if (!theme) {
        return [];
    }

    return APPEARANCE_COLOR_CONFIGS.map((colorConfig) => {
        const defaultValue = getThemeColorDefault(colorConfig, theme);
        if (typeof defaultValue !== 'string') {
            return null;
        }
        const field: InspectorField = {
            key: colorConfig.key,
            label: APPEARANCE_COLOR_TOKEN_LABELS[colorConfig.key] ?? colorConfig.key,
            type: 'color',
            defaultValue,
            frameVariant: 'gray',
        };

        return {
            value: String(props.values[colorConfig.key] ?? defaultValue),
            field,
        };
    }).filter((control): control is AppearanceColorControl => Boolean(control));
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

function pickFieldsByKey<T extends { key: string }>(fields: T[], keys: string[]) {
    return keys
        .map((key) => fields.find((field) => field.key === key))
        .filter((field): field is T => Boolean(field));
}

function fieldRowKey(fields: { key: string }[]) {
    return fields.map((field) => field.key).join('-');
}

function buildSingleFieldRow(field: InspectorField): InspectorFieldRow {
    return {
        id: field.key,
        type: 'single',
        fields: [field],
    };
}

function buildDoubleFieldRow(fields: InspectorField[]): InspectorFieldRow {
    return {
        id: fieldRowKey(fields),
        type: 'double',
        fields,
    };
}

function isCompactLayoutField(field: InspectorField) {
    return field.key !== 'frameAspectRatio';
}

function exifFieldValue(field: InspectorField) {
    return props.exifOverrides[field.key] ?? '';
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

function commitExifField(field: InspectorField, value: unknown) {
    emit('updateExif', field.key, String(value ?? ''));
}
</script>

<template>
    <aside class="inspector-panel">
        <InspectorSection title="外观">
            <InspectorFieldRows
                :rows="appearanceFieldRows"
                :value-for-field="fieldValue"
                @change="commitField"
                @input="updateDraft"
            />
        </InspectorSection>

        <InspectorSection title="版式">
            <template #actions>
                <ResetIconButton
                    ariaLabel="重置版式"
                    title="重置版式"
                    :disabled="layoutFieldsWithDefaults.length === 0"
                    @click="emit('resetLayout')"
                />
            </template>
            <InspectorFieldRows
                :rows="layoutFieldRows"
                :value-for-field="fieldValue"
                :label-for-field="compactFieldLabel"
                :compact-for-field="isCompactLayoutField"
                @change="commitField"
                @input="updateDraft"
            />
        </InspectorSection>

        <InspectorSection title="拍摄信息" content-class="exif-editor-content">
            <template #actions>
                <ResetIconButton
                    ariaLabel="重置拍摄信息"
                    title="重置拍摄信息"
                    @click="emit('resetExif')"
                />
            </template>
            <InspectorFieldRows
                :rows="exifFieldRows"
                :value-for-field="exifFieldValue"
                id-prefix="field-exif"
                @change="commitExifField"
            />
        </InspectorSection>
    </aside>
</template>
