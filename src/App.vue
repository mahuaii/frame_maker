<script setup lang="ts">
import { computed, reactive, ref, onBeforeUnmount, onMounted } from 'vue';
import { initFrameMakerApp } from '../js/app.js';
import {
    addImportedTemplate,
    getTemplateById,
    getTemplates,
    templates,
} from '../js/templates.js';
import BatchPhotoPanel from './components/BatchPhotoPanel.vue';
import ExportPanel from './components/ExportPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import PreviewCanvas from './components/PreviewCanvas.vue';
import TemplateList from './components/TemplateList.vue';
import TemplatePackageActions from './components/TemplatePackageActions.vue';
import TextEditorPanel from './components/TextEditorPanel.vue';
import UndoRedoToolbar from './components/UndoRedoToolbar.vue';
import UploadArea from './components/UploadArea.vue';
import { downloadBlob, exportCurrentPhoto } from './adapters/exportAdapter';
import { exportTemplateZip, importTemplateZip } from './adapters/templatePackageAdapter';
import { useEditorState } from './composables/useEditorState';
import { usePhotoStore } from './composables/usePhotoStore';
import { useTemplateStore } from './composables/useTemplateStore';
import type { ExportSettings } from './types/editor';
import type { FrameTemplate } from './types/template';
import './styles/vue-native.css';

let appInstance: ReturnType<typeof initFrameMakerApp> | null = null;
const isVueNativeMode = new URLSearchParams(window.location.search).get('app') === 'vue';
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
const uiState = reactive({
    isDraggingFile: false,
    isExporting: false,
    errorMessage: null as string | null,
});

const availableTemplates = templateStore.templates;
const canUndo = editor.canUndo;
const canRedo = editor.canRedo;
const selectedTextObjectId = editor.selectedTextObjectId;
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
const layoutFieldKeys = ['frameTop', 'frameRight', 'frameBottom', 'frameLeft', 'frameBorderWidth', 'frameAspectRatio'];

onMounted(() => {
    if (isVueNativeMode) {
        return;
    }

    appInstance = initFrameMakerApp({
        templates,
        getTemplates,
        getTemplateById,
        addImportedTemplate,
    });
});

onBeforeUnmount(() => {
    appInstance?.destroy();
    appInstance = null;
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

async function handleImportTemplate(file: File) {
    uiState.errorMessage = null;
    try {
        const { template } = await importTemplateZip(file);
        const importedTemplate = templateStore.registerImportedTemplate(template);
        editor.selectImportedTemplate(
            importedTemplate,
            templateStore.getInitialTemplateValues(importedTemplate)
        );
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
    }
}
</script>

<template>
    <main v-if="isVueNativeMode" class="vue-native-app">
        <TemplateList
            :templates="availableTemplates"
            :selected-template-id="selectedTemplateId"
            @select="selectTemplate"
        />

        <section class="vue-native-workspace">
            <div class="vue-native-toolbar">
                <UploadArea
                    :is-dragging="uiState.isDraggingFile"
                    @upload="handleUpload"
                    @drag-state="(value) => { uiState.isDraggingFile = value; }"
                />
                <UndoRedoToolbar
                    :can-undo="canUndo"
                    :can-redo="canRedo"
                    @undo="editor.undo"
                    @redo="editor.redo"
                />
            </div>
            <PreviewCanvas
                :photo="activePhoto"
                :template="selectedTemplate"
                :field-values="currentFieldValues"
                :exif-overrides="exifOverrides"
                :text-model="currentTextModel"
            />
            <p v-if="uiState.errorMessage" class="error-message">{{ uiState.errorMessage }}</p>
        </section>

        <aside class="vue-native-right-panel">
            <InspectorPanel
                :template="selectedTemplate"
                :values="currentFieldValues"
                :exif-overrides="exifOverrides"
                :default-values="defaultFieldValues"
                @update-field="(key, value) => editor.updateField(selectedTemplate.id, key, value)"
                @draft-field="(key, value) => editor.replaceFieldDraft(selectedTemplate.id, key, value)"
                @update-exif="editor.updateExif"
                @reset-layout="editor.resetLayoutFields(selectedTemplate, layoutFieldKeys, defaultFieldValues)"
                @reset-exif="editor.resetExif"
            />
            <TextEditorPanel
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
            <BatchPhotoPanel
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
            <TemplatePackageActions
                :template="selectedTemplate"
                @import-template="handleImportTemplate"
                @export-template="handleExportTemplate"
            />
            <ExportPanel
                :settings="exportSettings"
                :disabled="!activePhoto || uiState.isExporting"
                @update="updateExportSettings"
                @export="handleExport"
            />
        </aside>
    </main>

    <main v-else class="main-content">
        <section class="frame-selector" id="frame-selector">
            <h1 class="selector-title">Frame Maker</h1>
            <div class="selector-list" id="selector-list"></div>
        </section>

        <div class="workspace-column">
            <section class="preview-area" id="preview-area">
                <div class="upload-guide" id="upload-guide">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p>拖拽上传照片</p>
                    <p class="upload-hint">支持 JPG / PNG / WebP 格式</p>
                </div>
                <canvas id="preview-canvas"></canvas>
            </section>
        </div>

        <div class="inspector-resizer" id="inspector-resizer" role="separator" aria-orientation="vertical"
            aria-label="调整右侧栏宽度" tabindex="0"></div>

        <aside class="text-editor" id="text-editor"></aside>
    </main>

    <input v-if="!isVueNativeMode" type="file" id="file-input" accept="image/*" multiple hidden>
</template>
