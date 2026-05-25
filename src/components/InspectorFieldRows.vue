<script setup lang="ts">
import FieldControl from './FieldControl.vue';
import type { InspectorField } from '../types/inspector';
import type { InspectorFieldRow } from '../types/inspectorRows';

const props = withDefaults(defineProps<{
    rows: InspectorFieldRow[];
    valueForField: (field: InspectorField) => unknown;
    idPrefix?: string;
    labelForField?: (field: InspectorField) => string | undefined;
    compactForField?: (field: InspectorField) => boolean;
    compactTitleForField?: (field: InspectorField) => string | undefined;
}>(), {
    idPrefix: undefined,
    labelForField: undefined,
    compactForField: undefined,
    compactTitleForField: undefined,
});

const emit = defineEmits<{
    change: [field: InspectorField, value: unknown];
    input: [field: InspectorField, value: unknown];
}>();

function rowKey(row: InspectorFieldRow) {
    return row.id ?? row.fields.map((field) => field.key).join('-');
}

function rowClass(row: InspectorFieldRow) {
    return row.type === 'double'
        ? 'inspector-field-row-double'
        : 'inspector-field-row-single';
}
</script>

<template>
    <div
        v-for="row in rows"
        :key="rowKey(row)"
        :class="rowClass(row)"
    >
        <div v-if="row.title" class="field-group-label inspector-field-row-title">
            {{ row.title }}
        </div>
        <FieldControl
            v-for="field in row.fields"
            :key="field.key"
            :field="field"
            :value="props.valueForField(field)"
            :id-prefix="idPrefix"
            :label="props.labelForField?.(field)"
            :compact="props.compactForField?.(field)"
            :compact-title="props.compactTitleForField?.(field)"
            @change="(changedField, value) => emit('change', changedField, value)"
            @input="(changedField, value) => emit('input', changedField, value)"
        />
    </div>
</template>
