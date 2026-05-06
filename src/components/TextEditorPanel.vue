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
import type { FrameTemplate, TemplateFieldOption } from '../types/template';
import type {
    TextColorPaletteItem,
    TextItemType,
    TextModel,
    TextObject,
    TextObjectDropPosition,
} from '../types/text';

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
const imageInputRef = ref<HTMLInputElement | null>(null);

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
const standaloneFields = computed(() => selectedFields.value.filter((field) => TEXT_STANDALONE_FIELD_KEYS.has(field.key)));
const layoutFields = computed(() => selectedFields.value.filter((field) => TEXT_LAYOUT_FIELD_KEYS.has(field.key)));
const fontFields = computed(() => selectedFields.value.filter((field) => TEXT_FONT_FIELD_KEYS.has(field.key)));
const colorFields = computed(() => getTextColorFields(selectedFields.value));
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

function isSelectedOption(field: TextEditorField, option: TemplateFieldOption) {
    return String(fieldValue(field)) === String(option.value);
}

function chooseImage() {
    imageInputRef.value?.click();
}

function handleImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && selectedItem.value?.type === 'image') {
        emit('replaceImage', selectedItem.value.id, file);
    }
    input.value = '';
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
        defaultOption?.value ?? '',
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
</script>

<template>
    <section class="panel-section text-editor-panel">
        <header class="panel-section-header">
            <h2>文本对象</h2>
            <button class="section-reset-button" type="button" @click="emit('resetTextModel')">
                重置
            </button>
        </header>

        <div class="text-model-editor">
            <div class="text-object-tree">
                <div class="text-object-tree-header">
                    <span>组 / 项</span>
                    <div class="text-object-tree-actions">
                        <button class="secondary-button text-object-add-button" type="button" @click="emit('addRootGroup')">
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
                                class="text-object-delete-button"
                                :class="{ confirming: pendingDeleteObjectId === row.item.id }"
                                type="button"
                                :title="pendingDeleteObjectId === row.item.id ? '再次点击删除' : '删除'"
                                :aria-label="pendingDeleteObjectId === row.item.id ? '再次点击删除' : '删除'"
                                @click.stop="requestDelete(row.item.id)"
                                @pointerleave="clearPendingDelete"
                            >
                                ×
                            </button>
                            <button
                                class="text-object-visibility-button"
                                type="button"
                                :title="row.selfHidden ? '显示' : '隐藏'"
                                :aria-label="row.selfHidden ? '显示' : '隐藏'"
                                @click.stop="emit('toggleVisibility', row.item.id)"
                            >
                                {{ row.selfHidden ? '显' : '隐' }}
                            </button>
                        </div>
                    </article>
                </div>

                <p v-else class="text-object-empty">暂无文本组</p>

                <div v-if="selectedItem?.type === 'group'" class="text-object-action-bar">
                    <button class="secondary-button text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'text')">
                        +文字
                    </button>
                    <button class="secondary-button text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'separator')">
                        +分隔线
                    </button>
                    <button class="secondary-button text-object-action" type="button" @click="emit('addTextObject', selectedItem.id, 'image')">
                        +图片
                    </button>
                    <button
                        v-if="selectedLocation?.depth === 0"
                        class="secondary-button text-object-action"
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
                    <div v-if="standaloneFields.length" class="text-object-standalone-fields">
                        <div v-for="field in standaloneFields" :key="field.key" class="field-group">
                            <label :for="`text-${selectedItem.id}-${field.key}`">{{ field.label }}</label>
                            <textarea
                                v-if="field.type === 'textarea'"
                                :id="`text-${selectedItem.id}-${field.key}`"
                                :value="fieldValue(field) as string"
                                @change="updateField(field, ($event.target as HTMLTextAreaElement).value)"
                            ></textarea>
                            <input
                                v-else
                                :id="`text-${selectedItem.id}-${field.key}`"
                                type="text"
                                :value="fieldValue(field) as string"
                                @change="updateField(field, ($event.target as HTMLInputElement).value)"
                            >
                        </div>
                    </div>

                    <section v-if="layoutFields.length" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">{{ selectedItem.type === 'separator' ? '分隔线' : '布局' }}</h2>
                        </div>
                        <div class="inspector-section-content text-object-sectioned-fields">
                            <div v-for="field in layoutFields" :key="field.key" class="field-group">
                                <label :for="`text-${selectedItem.id}-${field.key}`">{{ field.label }}</label>

                                <div v-if="field.control === 'nine-grid'" class="nine-grid-picker">
                                    <button
                                        v-for="option in field.options ?? []"
                                        :key="option.value"
                                        class="nine-grid-picker-button"
                                        :class="{ selected: isSelectedOption(field, option) }"
                                        type="button"
                                        @click="updateField(field, option.value)"
                                    >
                                        {{ option.label }}
                                    </button>
                                </div>

                                <div v-else-if="field.control === 'frame-region'" class="frame-region-picker">
                                    <span class="frame-region-picker-photo"></span>
                                    <button
                                        v-for="option in field.options ?? []"
                                        :key="option.value"
                                        class="frame-region-picker-button"
                                        :class="[`frame-region-picker-${option.value}`, { selected: isSelectedOption(field, option) }]"
                                        type="button"
                                        @click="updateField(field, option.value)"
                                    >
                                        <span class="frame-region-picker-mark"></span>
                                        {{ option.label }}
                                    </button>
                                </div>

                                <label v-else-if="field.type === 'toggle'" class="toggle-row">
                                    <input
                                        type="checkbox"
                                        :checked="Boolean(fieldValue(field))"
                                        @change="updateField(field, ($event.target as HTMLInputElement).checked)"
                                    >
                                    <span>启用</span>
                                </label>

                                <input
                                    v-else-if="field.type === 'number'"
                                    :id="`text-${selectedItem.id}-${field.key}`"
                                    type="number"
                                    :min="field.min"
                                    :max="field.max"
                                    :step="field.step ?? 1"
                                    :value="fieldValue(field) as string | number"
                                    @change="updateField(field, ($event.target as HTMLInputElement).value)"
                                >

                                <select
                                    v-else
                                    :id="`text-${selectedItem.id}-${field.key}`"
                                    :value="String(fieldValue(field))"
                                    @change="updateField(field, ($event.target as HTMLSelectElement).value)"
                                >
                                    <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                                        {{ option.label }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section v-if="fontFields.length" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">字体</h2>
                        </div>
                        <div class="inspector-section-content text-object-sectioned-fields">
                            <div v-for="field in fontFields" :key="field.key" class="field-group">
                                <label :for="`text-${selectedItem.id}-${field.key}`">{{ field.label }}</label>
                                <label v-if="field.type === 'toggle'" class="toggle-row">
                                    <input
                                        type="checkbox"
                                        :checked="Boolean(fieldValue(field))"
                                        @change="updateField(field, ($event.target as HTMLInputElement).checked)"
                                    >
                                    <span>启用</span>
                                </label>
                                <input
                                    v-else-if="field.type === 'number'"
                                    :id="`text-${selectedItem.id}-${field.key}`"
                                    type="number"
                                    :min="field.min"
                                    :max="field.max"
                                    :step="field.step ?? 1"
                                    :value="fieldValue(field) as string | number"
                                    @change="updateField(field, ($event.target as HTMLInputElement).value)"
                                >
                                <select
                                    v-else
                                    :id="`text-${selectedItem.id}-${field.key}`"
                                    :value="String(fieldValue(field))"
                                    @change="updateField(field, ($event.target as HTMLSelectElement).value)"
                                >
                                    <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                                        {{ option.label }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section v-if="colorFields" class="inspector-section">
                        <div class="inspector-section-header">
                            <h2 class="inspector-section-title">颜色</h2>
                            <button
                                class="text-color-add-button"
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
                                        :key="row.token"
                                        class="text-color-row"
                                        :class="{ selected: row.selected }"
                                        type="button"
                                        :style="{ '--text-color-swatch': row.color }"
                                        @click="selectTokenColor(colorFields.tokenField, colorFields.colorField, row.token, row.color)"
                                    >
                                        <span class="text-color-swatch"></span>
                                        <span class="text-color-value">{{ formatColorHex(row.color) }}</span>
                                        <span class="text-color-opacity">{{ formatColorAlpha(row.color) }}</span>
                                        <span class="text-color-unit">%</span>
                                    </button>

                                    <div
                                        v-for="row in colorPaletteRows()"
                                        :key="row.paletteItem.id"
                                        class="text-color-row-shell text-color-row-shell-custom"
                                    >
                                        <div
                                            class="text-color-row text-color-row-custom"
                                            :class="{ selected: row.selected }"
                                            role="button"
                                            tabindex="0"
                                            :style="{ '--text-color-swatch': row.color }"
                                            @click="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                            @keydown.enter.prevent="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                            @keydown.space.prevent="selectTokenColor(colorFields.tokenField, colorFields.colorField, '', row.color)"
                                        >
                                            <span class="text-color-swatch"></span>
                                            <template v-if="row.selected">
                                                <input
                                                    class="text-color-value text-color-hex-input"
                                                    type="text"
                                                    maxlength="6"
                                                    :value="parseColorValue(row.color).hex"
                                                    aria-label="自定义颜色 HEX"
                                                    @click.stop
                                                    @input="updatePaletteHex(row.paletteItem, colorFields.tokenField, colorFields.colorField, ($event.target as HTMLInputElement).value, String(parseColorValue(row.color).alpha))"
                                                    @change="updatePaletteHex(row.paletteItem, colorFields.tokenField, colorFields.colorField, normalizeHexDraft(($event.target as HTMLInputElement).value, parseColorValue(row.color).hex), String(parseColorValue(row.color).alpha))"
                                                >
                                                <input
                                                    class="text-color-opacity text-color-alpha-input"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    :value="parseColorValue(row.color).alpha"
                                                    aria-label="自定义颜色不透明度"
                                                    @click.stop
                                                    @input="updatePaletteAlpha(row.paletteItem, colorFields.tokenField, colorFields.colorField, parseColorValue(row.color).hex, ($event.target as HTMLInputElement).value)"
                                                >
                                                <span class="text-color-unit">%</span>
                                            </template>
                                            <template v-else>
                                                <span class="text-color-value">{{ formatColorHex(row.color) }}</span>
                                                <span class="text-color-opacity">{{ formatColorAlpha(row.color) }}</span>
                                                <span class="text-color-unit">%</span>
                                            </template>
                                        </div>
                                        <button
                                            class="text-color-row-remove"
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
                        <input ref="imageInputRef" type="file" accept="image/*" hidden @change="handleImageSelected">
                        <button class="secondary-button" type="button" @click="chooseImage">
                            {{ selectedItem.source ? '替换图片' : '选择图片' }}
                        </button>
                        <button class="secondary-button" type="button" :disabled="!selectedItem.source" @click="clearImage">
                            清除图片
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </section>
</template>
