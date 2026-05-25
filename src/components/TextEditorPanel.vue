<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
    alphaPercentToHex,
    buildTextObjectFieldDefinitions,
    findTextObjectById,
    flattenTextModel,
    formatColorAlpha,
    formatColorHex,
    getColorOptionValue,
    getTextColorCustomValue,
    getTextColorDefaultOption,
    getTextColorFields,
    getTextColorTokenValue,
    getTextObjectDisplayLabel,
    getTextObjectDropPosition,
    getTextObjectEffectiveColor,
    getTextObjectFieldValue,
    getTextObjectTypeLabel,
    hasAncestorFontOverride,
    isValidTextObjectDrop,
    normalizeColorValue,
    normalizeHexDraft,
    parseColorValue,
    sanitizeHexDraft,
    TEXT_FONT_FIELD_KEYS,
    TEXT_LAYOUT_FIELD_KEYS,
    TEXT_STANDALONE_FIELD_KEYS,
    type FlatTextObject,
    type TextEditorField,
} from '../utils/textModelEditor';
import InspectorFieldRows from './InspectorFieldRows.vue';
import CheckboxControl from './CheckboxControl.vue';
import HiddenFileInput from './HiddenFileInput.vue';
import ResetIconButton from './ResetIconButton.vue';
import type { InspectorFieldOption } from '../types/inspector';
import type { InspectorFieldRow } from '../types/inspectorRows';
import type { FrameTemplate } from '../types/template';
import type {
    TextColorPaletteItem,
    TextItemType,
    TextModel,
    TextObject,
    TextObjectDropPosition,
} from '../types/text';

const EYE_ICON_PATHS = [
    'M1.5 8s2.25-4 6.5-4 6.5 4 6.5 4-2.25 4-6.5 4-6.5-4-6.5-4z',
    'M8 6.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z',
];
const EYE_OFF_ICON_PATHS = [
    ...EYE_ICON_PATHS,
    'M13.5 2.5l-11 11',
];
const TRASH_ICON_PATHS = [
    'M2.7 4h10.6',
    'M6.2 4V2.9h3.6V4',
    'M4 4l.5 9.1h7L12 4',
    'M6.8 6.4v4.4',
    'M9.2 6.4v4.4',
];
type TextFieldBlock =
    | { type: 'single'; field: TextEditorField }
    | { type: 'double'; fields: TextEditorField[]; title?: string }
    | { type: 'font-panel'; fontIdField: TextEditorField | null; variantFields: TextEditorField[] };

const props = defineProps<{
    template: FrameTemplate;
    fieldValues: Record<string, unknown>;
    textModel: TextModel;
    selectedObjectId: string | null;
    palette: TextColorPaletteItem[];
}>();

const emit = defineEmits<{
    selectObject: [objectId: string | null];
    resetTextModel: [];
    addRootGroup: [];
    addTextObject: [groupId: string, type: TextItemType];
    toggleVisibility: [objectId: string];
    deleteObject: [objectId: string];
    moveObject: [sourceId: string, targetId: string, position: TextObjectDropPosition];
    updateField: [objectId: string, fieldKey: string, value: unknown];
    draftField: [objectId: string, fieldKey: string, value: unknown];
    replaceImage: [objectId: string, file: File];
    clearImage: [objectId: string];
    selectColor: [objectId: string, tokenFieldKey: string, colorFieldKey: string, token: string, color: string];
    addColor: [objectId: string, tokenFieldKey: string, colorFieldKey: string, color: string];
    updateColor: [objectId: string, paletteId: string, tokenFieldKey: string, colorFieldKey: string, color: string];
    removeColor: [
        objectId: string,
        paletteId: string,
        tokenFieldKey: string,
        colorFieldKey: string,
        selected: boolean,
        defaultToken: string,
        defaultColor: string
    ];
}>();

const pendingDeleteObjectId = ref<string | null>(null);
const draggingObjectId = ref<string | null>(null);
const dropTarget = ref<{ targetId: string; position: TextObjectDropPosition } | null>(null);
const imageInputRef = ref<InstanceType<typeof HiddenFileInput> | null>(null);

const rows = computed(() => flattenTextModel(props.textModel));
const selectedLocation = computed(() => (
    props.selectedObjectId ? findTextObjectById(props.textModel, props.selectedObjectId) : null
));
const selectedItem = computed(() => selectedLocation.value?.item ?? null);
const selectedFields = computed(() => {
    if (!selectedLocation.value) {
        return [];
    }

    return buildTextObjectFieldDefinitions(
        selectedLocation.value.item,
        selectedLocation.value.depth,
        props.template,
        props.fieldValues,
        {
            inheritedFontOverride: hasAncestorFontOverride(props.textModel, selectedLocation.value.item.id),
        }
    );
});
const untitledSectionFields = computed(() => selectedFields.value.filter((field) => TEXT_STANDALONE_FIELD_KEYS.has(field.key)));
const layoutFields = computed(() => selectedFields.value.filter((field) => TEXT_LAYOUT_FIELD_KEYS.has(field.key)));
const fontFields = computed(() => selectedFields.value.filter((field) => TEXT_FONT_FIELD_KEYS.has(field.key)));
const colorFields = computed(() => getTextColorFields(selectedFields.value));
const layoutHeaderActionField = computed(() => layoutFields.value.find((field) => field.key === 'forceVisible') ?? null);
const fontHeaderActionField = computed(() => fontFields.value.find((field) => field.key === 'style.fontOverride') ?? null);
const layoutFieldBlocks = computed(() => buildLayoutFieldBlocks(layoutFields.value));
const fontFieldBlocks = computed(() => buildFontFieldBlocks(fontFields.value));
const untitledFieldRows = computed<InspectorFieldRow[]>(() => (
    untitledSectionFields.value.map((field) => buildSingleFieldRow(field))
));
const layoutFieldRows = computed<InspectorFieldRow[]>(() => buildFieldBlockRows(layoutFieldBlocks.value));
const fontFieldRows = computed<InspectorFieldRow[]>(() => buildFieldBlockRows(fontFieldBlocks.value));
const selectedColorToken = computed(() => (
    selectedItem.value && colorFields.value
        ? getTextColorTokenValue(selectedItem.value, colorFields.value.tokenField)
        : ''
));
const selectedCustomColor = computed(() => (
    selectedItem.value && colorFields.value
        ? getTextColorCustomValue(selectedItem.value, colorFields.value.colorField)
        : ''
));
const selectedCustomPaletteId = computed(() => {
    if (selectedColorToken.value || !selectedCustomColor.value) {
        return null;
    }

    return props.palette.find((item) => normalizeColorValue(item.value) === selectedCustomColor.value)?.id ?? null;
});

watch(() => [props.textModel, props.selectedObjectId] as const, () => {
    const nextSelectedId = findTextObjectById(props.textModel, props.selectedObjectId)
        ? props.selectedObjectId
        : props.textModel[0]?.id ?? null;
    if (nextSelectedId !== props.selectedObjectId) {
        emit('selectObject', nextSelectedId);
    }
}, {
    deep: true,
    immediate: true,
});

function clearPendingDelete() {
    pendingDeleteObjectId.value = null;
}

function selectObject(objectId: string) {
    clearPendingDelete();
    emit('selectObject', objectId);
}

function requestDelete(objectId: string) {
    if (pendingDeleteObjectId.value === objectId) {
        emit('deleteObject', objectId);
        pendingDeleteObjectId.value = null;
        return;
    }

    pendingDeleteObjectId.value = objectId;
}

function rowClasses(row: FlatTextObject) {
    return {
        selected: row.item.id === props.selectedObjectId,
        hidden: row.hidden,
        'self-hidden': row.selfHidden,
        'is-dragging': draggingObjectId.value === row.item.id,
        'drag-over-before': dropTarget.value?.targetId === row.item.id && dropTarget.value.position === 'before',
        'drag-over-after': dropTarget.value?.targetId === row.item.id && dropTarget.value.position === 'after',
        'drag-over-inside': dropTarget.value?.targetId === row.item.id && dropTarget.value.position === 'inside',
    };
}

function handleDragStart(row: FlatTextObject, event: DragEvent) {
    clearPendingDelete();
    draggingObjectId.value = row.item.id;
    event.dataTransfer?.setData('text/plain', row.item.id);
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
    }
}

function handleDragEnd() {
    draggingObjectId.value = null;
    dropTarget.value = null;
}

function resolveDrop(row: FlatTextObject, event: DragEvent) {
    const sourceId = draggingObjectId.value || event.dataTransfer?.getData('text/plain');
    const source = sourceId ? findTextObjectById(props.textModel, sourceId) : null;
    const target = findTextObjectById(props.textModel, row.item.id);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = getTextObjectDropPosition(source, target, event.clientY, rect.top, rect.height);

    if (!isValidTextObjectDrop(source, target, position)) {
        return null;
    }

    return { sourceId: sourceId!, targetId: row.item.id, position: position! };
}

function handleDragOver(row: FlatTextObject, event: DragEvent) {
    const drop = resolveDrop(row, event);
    if (!drop) {
        return;
    }

    event.preventDefault();
    dropTarget.value = {
        targetId: drop.targetId,
        position: drop.position,
    };
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}

function handleDrop(row: FlatTextObject, event: DragEvent) {
    const drop = resolveDrop(row, event);
    if (!drop) {
        return;
    }

    event.preventDefault();
    emit('moveObject', drop.sourceId, drop.targetId, drop.position);
    handleDragEnd();
}

function fieldValue(field: TextEditorField) {
    return selectedItem.value ? getTextObjectFieldValue(selectedItem.value, field) : '';
}

function normalizeFieldInputValue(field: TextEditorField, value: unknown) {
    if (field.type === 'toggle') {
        return Boolean(value);
    }

    if (field.type === 'number' || field.key === 'rotation' || field.key === 'style.fontWeight') {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : field.defaultValue ?? 0;
    }

    return value;
}

function updateField(field: TextEditorField, value: unknown) {
    if (!selectedItem.value) {
        return;
    }

    emit('updateField', selectedItem.value.id, field.key, normalizeFieldInputValue(field, value));
}

function draftField(field: TextEditorField, value: unknown) {
    if (!selectedItem.value) {
        return;
    }

    emit('draftField', selectedItem.value.id, field.key, normalizeFieldInputValue(field, value));
}

function getFieldByKey(fields: TextEditorField[], key: string) {
    return fields.find((field) => field.key === key) ?? null;
}

function buildPairedFieldBlock(fields: TextEditorField[], pairKeys: string[]): TextFieldBlock | null {
    const pairFields = pairKeys
        .map((fieldKey) => getFieldByKey(fields, fieldKey))
        .filter(Boolean) as TextEditorField[];

    if (pairFields.length === 0) {
        return null;
    }

    return {
        type: 'double',
        fields: pairFields,
        title: pairKeys[0] === 'offsetXScale' ? '偏移' : undefined,
    };
}

function buildSingleFieldRow(field: TextEditorField): InspectorFieldRow {
    return {
        id: field.key,
        type: 'single',
        fields: [field],
    };
}

function buildDoubleFieldRow(fields: TextEditorField[], title?: string): InspectorFieldRow {
    return {
        id: fields.map((field) => field.key).join('-'),
        type: 'double',
        title,
        fields,
    };
}

function buildFieldBlockRows(blocks: TextFieldBlock[]): InspectorFieldRow[] {
    return blocks.flatMap((block) => {
        if (block.type === 'single') {
            return [buildSingleFieldRow(block.field)];
        }

        if (block.type === 'double') {
            return [buildDoubleFieldRow(block.fields, block.title)];
        }

        return [
            ...(block.fontIdField ? [buildSingleFieldRow(block.fontIdField)] : []),
            ...block.variantFields.map((field) => buildSingleFieldRow(field)),
        ];
    });
}

function buildLayoutFieldBlocks(fields: TextEditorField[]): TextFieldBlock[] {
    const blocks: TextFieldBlock[] = [];
    const anchorLayoutFieldKeys = new Set(['region', 'anchor']);
    const headerActionFieldKeys = new Set(['forceVisible']);
    const pairedFieldKeyGroups = [
        ['rotation', 'align'],
        ['direction', 'gapScale'],
        ['offsetXScale', 'offsetYScale'],
        ['lengthScale', 'thicknessScale'],
    ];
    const pairedFieldKeys = new Set(pairedFieldKeyGroups.flat());

    fields.forEach((field) => {
        if (field.key === 'region') {
            const anchorFields = [getFieldByKey(fields, 'region'), getFieldByKey(fields, 'anchor')]
                .filter(Boolean) as TextEditorField[];
            if (anchorFields.length > 0) {
                blocks.push({ type: 'double', fields: anchorFields });
            }
            return;
        }

        if (anchorLayoutFieldKeys.has(field.key) || headerActionFieldKeys.has(field.key)) {
            return;
        }

        const pairKeys = pairedFieldKeyGroups.find(([firstKey]) => firstKey === field.key);
        if (pairKeys) {
            const block = buildPairedFieldBlock(fields, pairKeys);
            if (block) {
                blocks.push(block);
            }
            return;
        }

        if (pairedFieldKeys.has(field.key)) {
            return;
        }

        blocks.push({ type: 'single', field });
    });

    return blocks;
}

function buildFontFieldBlocks(fields: TextEditorField[]): TextFieldBlock[] {
    const blocks: TextFieldBlock[] = [];
    const fontPanelFieldKeys = new Set([
        'style.fontId',
        'style.fontStyle',
        'style.fontWeight',
        'style.fontOverride',
    ]);
    const pairedFieldKeyGroups = [
        ['style.fontScale', 'style.letterSpacingScale'],
    ];
    const pairedFieldKeys = new Set(pairedFieldKeyGroups.flat());

    fields.forEach((field) => {
        if (field.key === 'style.fontId') {
            blocks.push({
                type: 'font-panel',
                fontIdField: field,
                variantFields: [
                    getFieldByKey(fields, 'style.fontStyle'),
                    getFieldByKey(fields, 'style.fontWeight'),
                ].filter(Boolean) as TextEditorField[],
            });
            return;
        }

        if (fontPanelFieldKeys.has(field.key)) {
            return;
        }

        const pairKeys = pairedFieldKeyGroups.find(([firstKey]) => firstKey === field.key);
        if (pairKeys) {
            const block = buildPairedFieldBlock(fields, pairKeys);
            if (block) {
                blocks.push(block);
            }
            return;
        }

        if (pairedFieldKeys.has(field.key)) {
            return;
        }

        blocks.push({ type: 'single', field });
    });

    return blocks;
}

function compactTitle(field: TextEditorField) {
    const titles: Record<string, string> = {
        gapScale: '间距',
        'style.fontScale': '字号',
        'style.letterSpacingScale': '字距',
    };

    return titles[field.key];
}

function compactLabel(field: TextEditorField) {
    const labels: Record<string, string> = {
        offsetXScale: 'X',
        offsetYScale: 'Y',
    };

    return labels[field.key] ?? field.label;
}

function shouldRenderCompact(field: TextEditorField) {
    return field.type === 'number' && [
        'gapScale',
        'offsetXScale',
        'offsetYScale',
        'style.fontScale',
        'style.letterSpacingScale',
        'lengthScale',
        'thicknessScale',
    ].includes(field.key);
}

function updateToggleAction(field: TextEditorField, checked: boolean) {
    updateField(field, checked);
}

function isSelectedOption(field: TextEditorField, option: InspectorFieldOption) {
    return String(fieldValue(field)) === String(option.value);
}

function chooseImage() {
    imageInputRef.value?.open();
}

function handleImageSelected(files: FileList) {
    const file = files[0];
    if (file && selectedItem.value?.type === 'image') {
        emit('replaceImage', selectedItem.value.id, file);
    }
}

function colorTokenRows(tokenField: TextEditorField) {
    return (tokenField.options ?? []).map((option) => ({
        type: 'token' as const,
        token: option.value,
        color: getColorOptionValue(option),
        selected: selectedColorToken.value === option.value,
    }));
}

function colorPaletteRows() {
    return props.palette.map((item) => ({
        type: 'custom' as const,
        paletteItem: item,
        color: normalizeColorValue(item.value),
        selected: selectedCustomPaletteId.value === item.id,
    }));
}

function selectTokenColor(tokenField: TextEditorField, colorField: TextEditorField, token: string, color: string) {
    if (!selectedItem.value) {
        return;
    }

    emit('selectColor', selectedItem.value.id, tokenField.key, colorField.key, token, color);
}

function addCurrentColor(tokenField: TextEditorField, colorField: TextEditorField) {
    if (!selectedItem.value) {
        return;
    }

    emit(
        'addColor',
        selectedItem.value.id,
        tokenField.key,
        colorField.key,
        getTextObjectEffectiveColor(selectedItem.value, tokenField, colorField)
    );
}

function updatePaletteColor(
    paletteItem: TextColorPaletteItem,
    tokenField: TextEditorField,
    colorField: TextEditorField,
    nextValue: string
) {
    if (!selectedItem.value) {
        return;
    }

    emit('updateColor', selectedItem.value.id, paletteItem.id, tokenField.key, colorField.key, nextValue);
}

function updatePaletteHex(
    paletteItem: TextColorPaletteItem,
    tokenField: TextEditorField,
    colorField: TextEditorField,
    value: string,
    alpha: string
) {
    const hex = sanitizeHexDraft(value);
    if (hex.length !== 6) {
        return;
    }

    updatePaletteColor(paletteItem, tokenField, colorField, `#${hex}${alphaPercentToHex(alpha)}`);
}

function updatePaletteAlpha(
    paletteItem: TextColorPaletteItem,
    tokenField: TextEditorField,
    colorField: TextEditorField,
    hex: string,
    alpha: string
) {
    updatePaletteColor(
        paletteItem,
        tokenField,
        colorField,
        `#${normalizeHexDraft(hex)}${alphaPercentToHex(alpha)}`
    );
}

function removePaletteColor(
    paletteItem: TextColorPaletteItem,
    tokenField: TextEditorField,
    colorField: TextEditorField,
    selected: boolean
) {
    if (!selectedItem.value) {
        return;
    }

    const defaultOption = getTextColorDefaultOption(tokenField);
    emit(
        'removeColor',
        selectedItem.value.id,
        paletteItem.id,
        tokenField.key,
        colorField.key,
        selected,
        String(defaultOption?.value ?? ''),
        defaultOption ? getColorOptionValue(defaultOption) : getColorOptionValue(null)
    );
}

function clearImage() {
    if (selectedItem.value?.type === 'image') {
        emit('clearImage', selectedItem.value.id);
    }
}

function objectImageName(item: TextObject | null) {
    return item?.type === 'image' ? item.source?.name || '未选择图片' : '';
}

function visibilityIconPaths(row: FlatTextObject) {
    return row.selfHidden ? EYE_OFF_ICON_PATHS : EYE_ICON_PATHS;
}
</script>

<template>
    <div class="text-editor-panel">
        <div class="text-model-editor">
            <div class="text-object-tree">
                <div class="text-object-tree-header">
                    <span>组 / 项</span>
                    <div class="text-object-tree-actions">
                        <ResetIconButton ariaLabel="重置文本" title="重置文本" @click="emit('resetTextModel')" />
                        <button class="btn-small text-object-add-button" type="button" @click="emit('addRootGroup')">
                            新增文本组
                        </button>
                    </div>
                </div>

                <div v-if="rows.length" class="text-object-tree-list">
                    <article
                        v-for="row in rows"
                        :key="row.item.id"
                        class="text-object-node"
                        :class="rowClasses(row)"
                        :style="{ '--text-object-depth': row.depth }"
                    >
                        <div
                            class="text-object-row"
                            @dragover="handleDragOver(row, $event)"
                            @drop="handleDrop(row, $event)"
                            @dragleave="dropTarget = null"
                        >
                            <button
                                class="text-object-drag-handle"
                                type="button"
                                draggable="true"
                                title="拖拽排序"
                                aria-label="拖拽排序"
                                @dragstart="handleDragStart(row, $event)"
                                @dragend="handleDragEnd"
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                            <button class="text-object-select-button" type="button" @click="selectObject(row.item.id)">
                                <span class="text-object-type">{{ getTextObjectTypeLabel(row.item) }}</span>
                                <span class="text-object-label">{{ getTextObjectDisplayLabel(row.item, row.depth) }}</span>
                            </button>
                            <button
                                class="icon-button icon-button-sm text-object-delete-button"
                                :class="{ confirming: pendingDeleteObjectId === row.item.id }"
                                type="button"
                                :title="pendingDeleteObjectId === row.item.id ? '再次点击删除' : '删除'"
                                :aria-label="pendingDeleteObjectId === row.item.id ? '再次点击删除' : '删除'"
                                @click.stop="requestDelete(row.item.id)"
                                @pointerleave="clearPendingDelete"
                            >
                                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                    <path v-for="path in TRASH_ICON_PATHS" :key="path" :d="path"></path>
                                </svg>
                            </button>
                            <button
                                class="icon-button icon-button-sm text-object-visibility-button"
                                type="button"
                                :title="row.selfHidden ? '显示' : '隐藏'"
                                :aria-label="row.selfHidden ? '显示' : '隐藏'"
                                @click.stop="emit('toggleVisibility', row.item.id)"
                            >
                                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                    <path v-for="path in visibilityIconPaths(row)" :key="path" :d="path"></path>
                                </svg>
                            </button>
                        </div>
                    </article>
                </div>

                <p v-else class="text-object-empty">暂无文本组</p>

                <div v-if="selectedItem?.type === 'group'" class="text-object-action-bar">
                    <button class="btn-small text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'text')">
                        +文字
                    </button>
                    <button class="btn-small text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'separator')">
                        +分隔线
                    </button>
                    <button class="btn-small text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'image')">
                        +图片
                    </button>
                    <button
                        v-if="selectedLocation?.depth === 0"
                        class="btn-small text-object-action"
                        type="button"
                        @click="emit('addTextObject', selectedItem.id, 'group')"
                    >
                        +子组
                    </button>
                </div>
            </div>

            <div class="text-object-properties">
                <div v-if="!selectedItem" class="text-object-empty inspector-content-contained">
                    选择或新增文本组
                </div>

                <template v-else>
                    <section v-if="untitledSectionFields.length" class="inspector-section">
                        <div class="inspector-section-content">
                            <InspectorFieldRows
                                :rows="untitledFieldRows"
                                :value-for-field="fieldValue"
                                :id-prefix="`text-${selectedItem.id}`"
                                @change="updateField"
                                @input="draftField"
                            />
                        </div>
                    </section>

                    <section v-if="layoutFields.length" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">{{ selectedItem.type === 'separator' ? '分隔线' : '布局' }}</h2>
                            <CheckboxControl
                                v-if="layoutHeaderActionField"
                                class-name="text-section-checkbox-action"
                                label-class-name="text-section-checkbox-action-label"
                                label="强制显示"
                                title="强制显示"
                                aria-label="强制显示"
                                :checked="Boolean(fieldValue(layoutHeaderActionField))"
                                @change="updateToggleAction(layoutHeaderActionField, $event)"
                            />
                        </div>
                        <div class="inspector-section-content text-object-sectioned-fields">
                            <InspectorFieldRows
                                :rows="layoutFieldRows"
                                :value-for-field="fieldValue"
                                :id-prefix="`text-${selectedItem.id}`"
                                :compact-for-field="shouldRenderCompact"
                                :compact-title-for-field="compactTitle"
                                :label-for-field="compactLabel"
                                @change="updateField"
                                @input="draftField"
                            />
                        </div>
                    </section>

                    <section v-if="fontFields.length" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">字体</h2>
                            <CheckboxControl
                                v-if="fontHeaderActionField"
                                class-name="text-section-checkbox-action"
                                label-class-name="text-section-checkbox-action-label"
                                label="覆盖"
                                title="字体覆盖"
                                aria-label="字体覆盖"
                                :checked="Boolean(fieldValue(fontHeaderActionField))"
                                @change="updateToggleAction(fontHeaderActionField, $event)"
                            />
                        </div>
                        <div class="inspector-section-content text-object-sectioned-fields">
                            <InspectorFieldRows
                                :rows="fontFieldRows"
                                :value-for-field="fieldValue"
                                :id-prefix="`text-${selectedItem.id}`"
                                :compact-for-field="shouldRenderCompact"
                                :compact-title-for-field="compactTitle"
                                :label-for-field="compactLabel"
                                @change="updateField"
                                @input="draftField"
                            />
                        </div>
                    </section>

                    <section v-if="colorFields" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">颜色</h2>
                            <button
                                class="icon-button icon-button-sm text-color-add-button"
                                type="button"
                                aria-label="添加自定义颜色"
                                title="添加自定义颜色"
                                @click="addCurrentColor(colorFields.tokenField, colorFields.colorField)"
                            >
                                +
                            </button>
                        </div>
                        <div class="inspector-section-content">
                            <div class="text-color-panel field-group field-frame-gray">
                                <div class="text-color-row-list">
                                    <button
                                        v-for="row in colorTokenRows(colorFields.tokenField)"
                                        :key="String(row.token)"
                                        class="text-color-row color-row-control"
                                        :class="{ selected: row.selected }"
                                        type="button"
                                        :style="{ '--text-color-swatch': row.color }"
                                        @click="selectTokenColor(colorFields.tokenField, colorFields.colorField, String(row.token), row.color)"
                                    >
                                        <span class="text-color-swatch color-row-swatch"></span>
                                        <span class="text-color-value color-row-value">{{ formatColorHex(row.color) }}</span>
                                        <span class="text-color-opacity color-row-opacity">{{ formatColorAlpha(row.color) }}</span>
                                        <span class="text-color-unit color-row-unit">%</span>
                                    </button>

                                    <div
                                        v-for="row in colorPaletteRows()"
                                        :key="row.paletteItem.id"
                                        class="text-color-row-shell text-color-row-shell-custom"
                                    >
                                        <div
                                            class="text-color-row text-color-row-custom color-row-control"
                                            :class="{ selected: row.selected }"
                                            role="button"
                                            tabindex="0"
                                            :style="{ '--text-color-swatch': row.color }"
                                            @click="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                            @keydown.enter.prevent="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                            @keydown.space.prevent="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                        >
                                            <span class="text-color-swatch color-row-swatch"></span>
                                            <template v-if="row.selected">
                                                <input
                                                    class="text-color-value text-color-hex-input color-row-input color-row-value-input"
                                                    type="text"
                                                    maxlength="6"
                                                    :value="parseColorValue(row.color).hex"
                                                    aria-label="自定义颜色 HEX"
                                                    @click.stop
                                                    @input="updatePaletteHex(row.paletteItem, colorFields.tokenField, colorFields.colorField, ($event.target as HTMLInputElement).value, String(parseColorValue(row.color).alpha))"
                                                    @change="updatePaletteHex(row.paletteItem, colorFields.tokenField, colorFields.colorField, normalizeHexDraft(($event.target as HTMLInputElement).value, parseColorValue(row.color).hex), String(parseColorValue(row.color).alpha))"
                                                >
                                                <input
                                                    class="text-color-opacity text-color-alpha-input color-row-input color-row-opacity-input"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    :value="parseColorValue(row.color).alpha"
                                                    aria-label="自定义颜色不透明度"
                                                    @click.stop
                                                    @input="updatePaletteAlpha(row.paletteItem, colorFields.tokenField, colorFields.colorField, parseColorValue(row.color).hex, ($event.target as HTMLInputElement).value)"
                                                >
                                                <span class="text-color-unit color-row-unit">%</span>
                                            </template>
                                            <template v-else>
                                                <span class="text-color-value color-row-value">{{ formatColorHex(row.color) }}</span>
                                                <span class="text-color-opacity color-row-opacity">{{ formatColorAlpha(row.color) }}</span>
                                                <span class="text-color-unit color-row-unit">%</span>
                                            </template>
                                        </div>
                                        <button
                                            class="icon-button icon-button-sm text-color-row-remove"
                                            type="button"
                                            aria-label="删除自定义颜色"
                                            title="删除自定义颜色"
                                            @click="removePaletteColor(row.paletteItem, colorFields.tokenField, colorFields.colorField, row.selected)"
                                        >
                                            −
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div v-if="selectedItem.type === 'image'" class="image-source-control inspector-content-contained">
                        <div class="field-group-label">{{ objectImageName(selectedItem) }}</div>
                        <HiddenFileInput ref="imageInputRef" accept="image/*" @change="handleImageSelected" />
                        <button class="btn btn-secondary image-source-button" type="button" @click="chooseImage">
                            {{ selectedItem.source ? '替换图片' : '选择图片' }}
                        </button>
                        <button class="btn btn-secondary image-source-button" type="button" :disabled="!selectedItem.source" @click="clearImage">
                            清除图片
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
