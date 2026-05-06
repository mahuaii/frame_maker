<script setup lang="ts">
import { computed, reactive, ref, onBeforeUnmount, onMounted } from 'vue';
import { initFrameMakerApp } from '../js/app.js';
import {
    addImportedTemplate,
    getTemplateById,
    getTemplates,
    templates,
} from '../js/templates.js';
import ExportPanel from './components/ExportPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import PreviewCanvas from './components/PreviewCanvas.vue';
import TemplateList from './components/TemplateList.vue';
import UndoRedoToolbar from './components/UndoRedoToolbar.vue';
import UploadArea from './components/UploadArea.vue';
import { downloadBlob, exportCurrentPhoto } from './adapters/exportAdapter';
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

const selectedTemplate = computed(() => (
    templateStore.findTemplate(editor.state.value.selectedTemplateId)
));
const availableTemplates = templateStore.templates;
const canUndo = editor.canUndo;
const canRedo = editor.canRedo;
const activePhoto = computed(() => (
    photoStore.getPhotoById(editor.state.value.activePhotoId)
));
const currentFieldValues = computed(() => (
    editor.state.value.fieldValuesByTemplateId[selectedTemplate.value.id]
        ?? templateStore.getInitialTemplateValues(selectedTemplate.value)
));
const exifOverrides = computed(() => editor.state.value.exifOverrides);

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
});

function getFirstFile(files: FileList | File[]) {
    return Array.from(files)[0] ?? null;
}

async function handleUpload(files: FileList | File[]) {
    const file = getFirstFile(files);
    if (!file) {
        return;
    }

    uiState.errorMessage = null;
    if (file.type && !file.type.startsWith('image/')) {
        uiState.errorMessage = '请选择图片文件';
        return;
    }

    try {
        const { entry, exifOverrides } = await photoStore.addPhoto(file);
        editor.setActivePhoto(entry.id, exifOverrides);
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

async function handleExport() {
    const photo = activePhoto.value;
    const template = selectedTemplate.value;
    if (!photo || !template || uiState.isExporting) {
        return;
    }

    uiState.isExporting = true;
    uiState.errorMessage = null;

    try {
        const { blob, filename } = await exportCurrentPhoto({
            photo,
            template,
            fieldValues: currentFieldValues.value,
            exifOverrides: exifOverrides.value,
            settings: exportSettings.value,
        });
        downloadBlob(blob, filename);
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
            :selected-template-id="selectedTemplate.id"
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
            />
            <p v-if="uiState.errorMessage" class="error-message">{{ uiState.errorMessage }}</p>
        </section>

        <aside class="vue-native-right-panel">
            <InspectorPanel
                :template="selectedTemplate"
                :values="currentFieldValues"
                :exif-overrides="exifOverrides"
                @update-field="(key, value) => editor.updateField(selectedTemplate.id, key, value)"
                @draft-field="(key, value) => editor.replaceFieldDraft(selectedTemplate.id, key, value)"
                @update-exif="editor.updateExif"
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
