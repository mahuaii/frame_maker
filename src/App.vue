<script setup lang="ts">
import { computed, reactive, ref, onBeforeUnmount, onMounted } from 'vue';
import {
    DEFAULT_INSPECTOR_WIDTH,
    MAX_INSPECTOR_WIDTH,
    MIN_INSPECTOR_WIDTH,
    MIN_WORKSPACE_WIDTH,
} from './constants/ui';
import BatchPhotoPanel from './components/BatchPhotoPanel.vue';
import ExportPanel from './components/ExportPanel.vue';
import HiddenFileInput from './components/HiddenFileInput.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import PreviewCanvas from './components/PreviewCanvas.vue';
import TemplateList from './components/TemplateList.vue';
import TemplatePackageActions from './components/TemplatePackageActions.vue';
import TextEditorPanel from './components/TextEditorPanel.vue';
import UndoRedoToolbar from './components/UndoRedoToolbar.vue';
import { downloadBlob, exportCurrentPhoto } from './adapters/exportAdapter';
import { exportTemplateZip, importTemplateZip } from './adapters/templatePackageAdapter';
import { useEditorState } from './composables/useEditorState';
import { usePhotoStore } from './composables/usePhotoStore';
import { useTemplateStore } from './composables/useTemplateStore';
import { FRAME_LAYOUT_FIELD_KEYS } from '../js/core/templates/frame-layout.ts';
import type { ExportSettings } from './types/editor';
import type { FrameTemplate } from './types/template';

const templateStore = useTemplateStore();
const photoStore = usePhotoStore();
const editor = useEditorState(
    templateStore.defaultTemplate,
    templateStore.getInitialTemplateValues(templateStore.defaultTemplate)
);
const exportSettings = ref<ExportSettings>({
    format: 'image/jpeg',
    sizePreset: 'original',
    customWidth: '',
    customHeight: '',
    jpegQuality: 1,
});
const activeInspectorPanel = ref<'basic' | 'text' | 'batch'>('basic');
const exportMenuOpen = ref(false);
const vueFileInputRef = ref<InstanceType<typeof HiddenFileInput> | null>(null);
const vueAppRef = ref<HTMLElement | null>(null);
const vueRightPanelRef = ref<HTMLElement | null>(null);
const inspectorWidth = ref(DEFAULT_INSPECTOR_WIDTH);
const activeResizePointerId = ref<number | null>(null);
const uiState = reactive({
    isDraggingFile: false,
    isExporting: false,
    errorMessage: null as string | null,
});

const availableTemplates = templateStore.templates;
const selectedTextObjectId = editor.selectedTextObjectId;
const canUndo = editor.canUndo;
const canRedo = editor.canRedo;
const photos = photoStore.photos;
const activePhoto = computed(() => (
    photoStore.getPhotoById(editor.state.value.activePhotoId)
));
const activePhotoEditState = editor.activePhotoState;
const selectedTemplateId = computed(() => activePhotoEditState.value.selectedTemplateId);
const selectedTemplate = computed(() => (
    templateStore.findTemplate(selectedTemplateId.value)
));
const selectedExportPhotos = computed(() => (
    photoStore.photos.value.filter((photo) => (
        editor.state.value.photoStatesById[photo.id]?.selectedForExport
    ))
));
const currentFieldValues = computed(() => (
    activePhotoEditState.value.fieldValuesByTemplateId[selectedTemplate.value.id]
        ?? templateStore.getInitialTemplateValues(selectedTemplate.value)
));
const currentTextModel = computed(() => editor.getTextModel(selectedTemplate.value));
const currentTextColorPalette = computed(() => editor.getTextColorPalette(selectedTemplate.value));
const defaultFieldValues = computed(() => templateStore.getInitialTemplateValues(selectedTemplate.value));
const exifOverrides = computed(() => activePhotoEditState.value.exifOverrides);
const vueAppStyle = computed(() => ({
    '--inspector-width': `${inspectorWidth.value}px`,
}));

let resizeStartX = 0;
let resizeStartWidth = DEFAULT_INSPECTOR_WIDTH;

function getInspectorMaxWidth() {
    const appWidth = vueAppRef.value?.clientWidth ?? 0;
    if (!appWidth) {
        return MAX_INSPECTOR_WIDTH;
    }

    return Math.min(
        MAX_INSPECTOR_WIDTH,
        Math.max(MIN_INSPECTOR_WIDTH, appWidth - MIN_WORKSPACE_WIDTH)
    );
}

function clampVueInspectorWidth(width: number) {
    if (!Number.isFinite(width)) {
        return DEFAULT_INSPECTOR_WIDTH;
    }

    return Math.min(
        Math.max(Math.round(width), MIN_INSPECTOR_WIDTH),
        getInspectorMaxWidth()
    );
}

function setVueInspectorWidth(width: number) {
    inspectorWidth.value = clampVueInspectorWidth(width);
}

function stopVueInspectorResize() {
    if (activeResizePointerId.value === null) {
        return;
    }

    activeResizePointerId.value = null;
    document.body.classList.remove('is-resizing-inspector');
}

function handleVueInspectorResizePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
        return;
    }

    const target = event.currentTarget as HTMLElement;
    event.preventDefault();
    activeResizePointerId.value = event.pointerId;
    resizeStartX = event.clientX;
    resizeStartWidth = vueRightPanelRef.value?.getBoundingClientRect().width ?? inspectorWidth.value;
    target.setPointerCapture(event.pointerId);
    document.body.classList.add('is-resizing-inspector');
}

function handleVueInspectorResizePointerMove(event: PointerEvent) {
    if (event.pointerId !== activeResizePointerId.value) {
        return;
    }

    setVueInspectorWidth(resizeStartWidth + resizeStartX - event.clientX);
}

function handleVueInspectorResizeKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? 1 : -1;
    const step = event.shiftKey ? 32 : 12;
    const currentWidth = vueRightPanelRef.value?.getBoundingClientRect().width ?? inspectorWidth.value;
    setVueInspectorWidth(currentWidth + direction * step);
}

function handleWindowResize() {
    setVueInspectorWidth(inspectorWidth.value);
}

onMounted(() => {
    window.addEventListener('resize', handleWindowResize);
    setVueInspectorWidth(DEFAULT_INSPECTOR_WIDTH);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize);
    document.body.classList.remove('is-resizing-inspector');
    editor.releaseAllTextObjectUrls();
});

async function handleUpload(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => (
        file.type ? file.type.startsWith('image/') : true
    ));
    if (imageFiles.length === 0) {
        uiState.errorMessage = '请选择图片文件';
        return;
    }

    uiState.errorMessage = null;

    try {
        const loadedPhotos = await photoStore.addPhotos(imageFiles);
        loadedPhotos.forEach(({ entry, exifOverrides }) => {
            editor.addPhoto(entry.id, exifOverrides);
        });
    } catch (error) {
        uiState.errorMessage = error instanceof Error ? error.message : '图片加载失败';
    }
}

function selectTemplate(template: FrameTemplate) {
    editor.selectTemplate(template, templateStore.getInitialTemplateValues(template));
}

function updateExportSettings(settings: ExportSettings) {
    exportSettings.value = settings;
}

function triggerVueUpload() {
    vueFileInputRef.value?.open();
}

function setActiveInspectorPanel(panel: 'basic' | 'text' | 'batch') {
    activeInspectorPanel.value = panel;
    exportMenuOpen.value = false;
}

async function handleImportTemplate(file: File) {
    uiState.errorMessage = null;
    try {
        const { template } = await importTemplateZip(file);
        const importedTemplate = templateStore.registerImportedTemplate(template);
        selectTemplate(importedTemplate);
    } catch (error) {
        uiState.errorMessage = error instanceof Error ? error.message : '模板导入失败';
    }
}

async function handleExportTemplate() {
    uiState.errorMessage = null;
    try {
        const { blob, filename } = await exportTemplateZip(selectedTemplate.value);
        downloadBlob(blob, filename);
    } catch (error) {
        uiState.errorMessage = error instanceof Error ? error.message : '模板导出失败';
    }
}

async function handleExport() {
    const photosToExport = selectedExportPhotos.value.length > 0
        ? selectedExportPhotos.value
        : activePhoto.value ? [activePhoto.value] : [];
    if (photosToExport.length === 0 || uiState.isExporting) {
        return;
    }

    uiState.isExporting = true;
    uiState.errorMessage = null;

    try {
        for (const photo of photosToExport) {
            const photoState = editor.state.value.photoStatesById[photo.id] ?? activePhotoEditState.value;
            const template = templateStore.findTemplate(photoState.selectedTemplateId);
            const fieldValues = photoState.fieldValuesByTemplateId[template.id]
                ?? templateStore.getInitialTemplateValues(template);
            const textModel = editor.getTextModelFromState(photoState, template);
            const { blob, filename } = await exportCurrentPhoto({
                photo,
                template,
                fieldValues,
                exifOverrides: photoState.exifOverrides,
                textModel,
                settings: exportSettings.value,
            });
            downloadBlob(blob, filename);
        }
    } catch (error) {
        uiState.errorMessage = error instanceof Error ? error.message : '导出图片失败';
    } finally {
        uiState.isExporting = false;
        exportMenuOpen.value = false;
    }
}
</script>

<template>
    <main ref="vueAppRef" class="vue-native-app" :style="vueAppStyle">
        <TemplateList
            :templates="availableTemplates"
            :selected-template-id="selectedTemplateId"
            @select="selectTemplate"
        />

        <section class="vue-native-workspace">
            <PreviewCanvas
                :photo="activePhoto"
                :template="selectedTemplate"
                :field-values="currentFieldValues"
                :exif-overrides="exifOverrides"
                :text-model="currentTextModel"
                :is-dragging="uiState.isDraggingFile"
                @upload="handleUpload"
                @drag-state="(value) => { uiState.isDraggingFile = value; }"
            />
            <p v-if="uiState.errorMessage" class="error-message">{{ uiState.errorMessage }}</p>
        </section>

        <div
            class="inspector-resizer"
            :class="{ 'is-dragging': activeResizePointerId !== null }"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整右侧栏宽度"
            :aria-valuemin="MIN_INSPECTOR_WIDTH"
            :aria-valuemax="getInspectorMaxWidth()"
            :aria-valuenow="inspectorWidth"
            tabindex="0"
            @pointerdown="handleVueInspectorResizePointerDown"
            @pointermove="handleVueInspectorResizePointerMove"
            @pointerup="stopVueInspectorResize"
            @pointercancel="stopVueInspectorResize"
            @keydown="handleVueInspectorResizeKeyDown"
        ></div>

        <aside ref="vueRightPanelRef" class="vue-native-right-panel text-editor">
            <div class="inspector-action-area">
                <div class="inspector-action-row">
                    <button
                        class="btn icon-button icon-button-toolbar inspector-upload-button"
                        type="button"
                        aria-label="上传照片"
                        title="上传照片"
                        @click="triggerVueUpload"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M6 3.5h8l4 4V20.5H6z"></path>
                            <path d="M14 3.5v4h4"></path>
                        </svg>
                    </button>
                    <div class="export-split-button" :class="{ 'is-open': exportMenuOpen }">
                        <button
                            class="export-split-action"
                            type="button"
                            :disabled="!activePhoto || uiState.isExporting"
                            @click="handleExport"
                        >
                            <span>导出</span>
                        </button>
                        <button
                            class="export-menu-toggle"
                            type="button"
                            aria-label="展开导出设置"
                            aria-controls="vue-export-settings-menu"
                            :aria-expanded="exportMenuOpen"
                            title="导出设置"
                            @click="exportMenuOpen = !exportMenuOpen"
                        ></button>
                        <div
                            id="vue-export-settings-menu"
                            class="export-settings-menu"
                            :hidden="!exportMenuOpen"
                        >
                            <ExportPanel
                                :settings="exportSettings"
                                :disabled="!activePhoto || uiState.isExporting"
                                @update="updateExportSettings"
                                @export="handleExport"
                            />
                        </div>
                    </div>
                </div>
                <TemplatePackageActions
                    :template="selectedTemplate"
                    @import-template="handleImportTemplate"
                    @export-template="handleExportTemplate"
                />
                <UndoRedoToolbar
                    :can-undo="canUndo"
                    :can-redo="canRedo"
                    @undo="editor.undo"
                    @redo="editor.redo"
                />
                <div class="inspector-panel-tabs" role="tablist" aria-label="设置面板">
                    <button
                        class="inspector-panel-tab"
                        :class="{ selected: activeInspectorPanel === 'basic' }"
                        type="button"
                        role="tab"
                        :aria-selected="activeInspectorPanel === 'basic'"
                        @click="setActiveInspectorPanel('basic')"
                    >
                        基本
                    </button>
                    <button
                        class="inspector-panel-tab"
                        :class="{ selected: activeInspectorPanel === 'text' }"
                        type="button"
                        role="tab"
                        :aria-selected="activeInspectorPanel === 'text'"
                        @click="setActiveInspectorPanel('text')"
                    >
                        文本
                    </button>
                    <button
                        class="inspector-panel-tab"
                        :class="{ selected: activeInspectorPanel === 'batch' }"
                        type="button"
                        role="tab"
                        :aria-selected="activeInspectorPanel === 'batch'"
                        @click="setActiveInspectorPanel('batch')"
                    >
                        批量
                    </button>
                </div>
            </div>
            <div class="inspector-scroll-area">
                <BatchPhotoPanel
                    v-if="activeInspectorPanel === 'batch'"
                    :photos="photos"
                    :active-photo-id="editor.state.value.activePhotoId"
                    :photo-states-by-id="editor.state.value.photoStatesById"
                    :copied-settings-available="Boolean(editor.state.value.copiedSettings)"
                    @select-photo="editor.setActivePhoto"
                    @toggle-export="editor.setPhotoExportSelection"
                    @copy-settings="editor.copyActivePhotoSettings"
                    @paste-settings="editor.pasteSettingsToActivePhoto"
                    @apply-settings-to-all="editor.applyActivePhotoSettingsToAll"
                />
                <TextEditorPanel
                    v-else-if="activeInspectorPanel === 'text'"
                    :template="selectedTemplate"
                    :field-values="currentFieldValues"
                    :text-model="currentTextModel"
                    :selected-object-id="selectedTextObjectId"
                    :palette="currentTextColorPalette"
                    @select-object="editor.setSelectedTextObject"
                    @reset-text-model="editor.resetTextModel(selectedTemplate)"
                    @add-root-group="editor.addRootTextGroup(selectedTemplate)"
                    @add-text-object="(groupId, type) => editor.addTextObject(selectedTemplate, groupId, type)"
                    @toggle-visibility="(objectId) => editor.toggleTextObjectVisibility(selectedTemplate, objectId)"
                    @delete-object="(objectId) => editor.deleteTextObject(selectedTemplate, objectId)"
                    @move-object="(sourceId, targetId, position) => editor.moveTextObject(selectedTemplate, sourceId, targetId, position)"
                    @update-field="(objectId, fieldKey, value) => editor.updateTextObjectField(selectedTemplate, objectId, fieldKey, value)"
                    @replace-image="(objectId, file) => editor.replaceTextImageFile(selectedTemplate, objectId, file)"
                    @clear-image="(objectId) => editor.clearTextImageSource(selectedTemplate, objectId)"
                    @select-color="(objectId, tokenFieldKey, colorFieldKey, token, color) => editor.selectTextColor(selectedTemplate, objectId, tokenFieldKey, colorFieldKey, token, color)"
                    @add-color="(objectId, tokenFieldKey, colorFieldKey, color) => editor.addTextColor(selectedTemplate, objectId, tokenFieldKey, colorFieldKey, color)"
                    @update-color="(objectId, paletteId, tokenFieldKey, colorFieldKey, color) => editor.updateTextColor(selectedTemplate, objectId, paletteId, tokenFieldKey, colorFieldKey, color)"
                    @remove-color="(objectId, paletteId, tokenFieldKey, colorFieldKey, selected, defaultToken, defaultColor) => editor.removeTextColor(selectedTemplate, objectId, paletteId, tokenFieldKey, colorFieldKey, selected, defaultToken, defaultColor)"
                />
                <InspectorPanel
                    v-else
                    :template="selectedTemplate"
                    :values="currentFieldValues"
                    :exif-overrides="exifOverrides"
                    :default-values="defaultFieldValues"
                    @update-field="(key, value) => editor.updateField(selectedTemplate, key, value)"
                    @draft-field="(key, value) => editor.replaceFieldDraft(selectedTemplate, key, value)"
                    @update-exif="editor.updateExif"
                    @reset-layout="editor.resetLayoutFields(selectedTemplate, [...FRAME_LAYOUT_FIELD_KEYS], defaultFieldValues)"
                    @reset-exif="editor.resetExif"
                />
            </div>
        </aside>
        <HiddenFileInput ref="vueFileInputRef" accept="image/*" multiple @change="handleUpload" />
    </main>
</template>
