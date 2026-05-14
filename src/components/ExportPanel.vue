<script setup lang="ts">
import FieldControl from './FieldControl.vue';
import type { ExportSettings } from '../types/editor';
import type { InspectorField } from '../types/inspector';

defineProps<{
    settings: ExportSettings;
    disabled: boolean;
}>();

const emit = defineEmits<{
    update: [settings: ExportSettings];
    export: [];
}>();

function patch(settings: ExportSettings, patchValues: Partial<ExportSettings>) {
    emit('update', {
        ...settings,
        ...patchValues,
    });
}

function clampJpegQuality(value: unknown) {
    const quality = Number(value);
    if (!Number.isFinite(quality)) {
        return 1;
    }

    return Math.min(Math.max(quality, 0.01), 1);
}

function parseJpegQualityInput(value: unknown) {
    const rawValue = typeof value === 'string' ? value.trim() : value;
    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? clampJpegQuality(rawValue) : null;
    }

    if (typeof rawValue !== 'string') {
        return null;
    }

    const matchedValue = rawValue.match(/^(\d+(?:\.\d+)?)(%)?$/);
    if (!matchedValue) {
        return null;
    }

    const percentage = Number(matchedValue[1]);
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
        return null;
    }

    return percentage / 100;
}

function formatJpegQualityLabel(quality: unknown) {
    return `${Number((clampJpegQuality(quality) * 100).toFixed(2))}%`;
}

function buildJpegQualityOptions() {
    const options = [];
    for (let quality = 100; quality >= 70; quality -= 5) {
        options.push({
            value: quality / 100,
            label: `${quality}%`,
        });
    }
    return options;
}

const sizePresetField: InspectorField = {
    key: 'sizePreset',
    label: '尺寸',
    type: 'select',
    defaultValue: 'original',
    groupClassName: 'export-field export-size-field field-frame-gray',
    options: [
        { value: 'original', label: '原始尺寸' },
        { value: '1080', label: '长边 1080px' },
        { value: '2048', label: '长边 2048px' },
        { value: 'custom', label: '自定义' },
    ],
};
const customWidthField: InspectorField = {
    key: 'customWidth',
    label: 'W',
    type: 'number',
    min: 1,
    step: 1,
    inputMode: 'numeric',
    placeholder: '宽度',
};
const customHeightField: InspectorField = {
    key: 'customHeight',
    label: 'H',
    type: 'number',
    min: 1,
    step: 1,
    inputMode: 'numeric',
    placeholder: '高度',
};
const jpegQualityField: InspectorField = {
    key: 'jpegQuality',
    label: 'JPEG 质量',
    type: 'option-input',
    inputMode: 'numeric',
    defaultValue: 1,
    groupClassName: 'export-field export-quality-field field-frame-gray',
    formatValue: formatJpegQualityLabel,
    parseValue: parseJpegQualityInput,
    options: buildJpegQualityOptions(),
};

function handleFieldChange(settings: ExportSettings, field: InspectorField, value: unknown) {
    switch (field.key) {
        case 'sizePreset':
            patch(settings, { sizePreset: value as ExportSettings['sizePreset'] });
            break;
        case 'customWidth':
        case 'customHeight':
            patch(settings, { [field.key]: value === '' ? '' : String(value) });
            break;
        case 'jpegQuality':
            patch(settings, { jpegQuality: clampJpegQuality(value) });
            break;
        default:
            break;
    }
}
</script>

<template>
    <div class="export-controls">
        <div class="export-primary-fields">
            <FieldControl
                :field="sizePresetField"
                :value="settings.sizePreset"
                id-prefix="export"
                @change="(field, value) => handleFieldChange(settings, field, value)"
            />
            <FieldControl
                :field="jpegQualityField"
                :value="settings.jpegQuality"
                id-prefix="export"
                @change="(field, value) => handleFieldChange(settings, field, value)"
            />
        </div>
        <div
            class="export-custom-size inspector-field-grid inspector-field-grid-contained"
            :class="{ hidden: settings.sizePreset !== 'custom' }"
            id="export-custom-size"
        >
            <FieldControl
                :field="customWidthField"
                :value="settings.customWidth"
                id-prefix="export"
                @change="(field, value) => handleFieldChange(settings, field, value)"
            />
            <FieldControl
                :field="customHeightField"
                :value="settings.customHeight"
                id-prefix="export"
                @change="(field, value) => handleFieldChange(settings, field, value)"
            />
        </div>
        <button class="btn btn-primary vue-export-menu-action" type="button" :disabled="disabled" @click="emit('export')">
            导出 JPG
        </button>
    </div>
</template>
