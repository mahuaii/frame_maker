<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import ExportPanel from './components/ExportPanel.vue';
import InspectorPanel from './components/InspectorPanel.vue';
import PreviewCanvas from './components/PreviewCanvas.vue';
import TemplateList from './components/TemplateList.vue';
import TemplatePackageActions from './components/TemplatePackageActions.vue';
import UndoRedoToolbar from './components/UndoRedoToolbar.vue';
import UploadArea from './components/UploadArea.vue';
import { downloadBlob, exportCurrentPhoto } from './adapters/exportAdapter';
import { exportTemplateZip, importTemplateZip } from './adapters/templatePackageAdapter';
import { useEditorState } from './composables/useEditorState';
import { usePhotoStore } from './composables/usePhotoStore';
import { useTemplateStore } from './composables/useTemplateStore';
import type { ExportSettings, UiState } from './types/editor';
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
const ui = reactive<UiState>({
    inspectorPanel: 'settings',
    isDraggingFile: false,
    isExporting: false,
    errorMessage: null,
});

const activePhoto = computed(() => photoStore.getPhotoById(editor.state.value.activePhotoId));
const activeTemplate = computed(() => templateStore.findTemplate(editor.state.value.selectedTemplateId));
const templates = templateStore.templates;
const activeFieldValues = computed(() => (
    editor.state.value.fieldValuesByTemplateId[activeTemplate.value.id]
    ?? templateStore.getInitialTemplateValues(activeTemplate.value)
));

function setError(error: unknown) {
    ui.errorMessage = error instanceof Error ? error.message : String(error);
}

async function handleUpload(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (!file) return;

    ui.errorMessage = files.length > 1 ? '已选择多张照片，当前只使用第一张。' : null;

    try {
        const { entry, exifOverrides } = await photoStore.addPhoto(file);
        editor.setActivePhoto(entry.id, exifOverrides);
    } catch (error) {
        setError(error);
    }
}

function selectTemplate(template: FrameTemplate) {
    editor.selectTemplate(template, templateStore.getInitialTemplateValues(template));
}

async function handleExportPhoto() {
    if (!activePhoto.value || !activeTemplate.value) return;

    ui.isExporting = true;
    ui.errorMessage = null;
    try {
        const result = await exportCurrentPhoto({
            photo: activePhoto.value,
            template: activeTemplate.value,
            fieldValues: activeFieldValues.value,
            exifOverrides: editor.state.value.exifOverrides,
            settings: exportSettings.value,
        });
        downloadBlob(result.blob, result.filename);
    } catch (error) {
        setError(error);
    } finally {
        ui.isExporting = false;
    }
}

async function handleImportTemplate(file: File) {
    ui.errorMessage = null;
    try {
        const result = await importTemplateZip(file);
        const importedTemplate = templateStore.registerImportedTemplate(result.template);
        editor.selectTemplate(importedTemplate, templateStore.getInitialTemplateValues(importedTemplate));
    } catch (error) {
        setError(error);
    }
}

async function handleExportTemplate() {
    ui.errorMessage = null;
    try {
        const result = await exportTemplateZip(activeTemplate.value);
        downloadBlob(result.blob, result.filename);
    } catch (error) {
        setError(error);
    }
}

function handleKeyboard(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
    if (isInput) return;

    const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
    const isRedo = ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z')
        || (event.ctrlKey && event.key.toLowerCase() === 'y');

    if (isUndo) {
        event.preventDefault();
        editor.undo();
    }

    if (isRedo) {
        event.preventDefault();
        editor.redo();
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyboard);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyboard);
});
</script>

<template>
    <main class="app-shell">
        <TemplateList
            :templates="templates"
            :selected-template-id="editor.state.value.selectedTemplateId"
            @select="selectTemplate"
        />

        <section class="workspace">
            <header class="workspace-toolbar">
                <UploadArea
                    :is-dragging="ui.isDraggingFile"
                    @drag-state="ui.isDraggingFile = $event"
                    @upload="handleUpload"
                />
                <UndoRedoToolbar
                    :can-undo="editor.canUndo.value"
                    :can-redo="editor.canRedo.value"
                    @undo="editor.undo"
                    @redo="editor.redo"
                />
            </header>
            <PreviewCanvas
                :photo="activePhoto"
                :template="activeTemplate"
                :field-values="activeFieldValues"
                :exif-overrides="editor.state.value.exifOverrides"
            />
            <p v-if="ui.errorMessage" class="error-message">{{ ui.errorMessage }}</p>
        </section>

        <section class="right-panel">
            <InspectorPanel
                :template="activeTemplate"
                :values="activeFieldValues"
                :exif-overrides="editor.state.value.exifOverrides"
                @update-field="(key, value) => editor.updateField(activeTemplate.id, key, value)"
                @draft-field="(key, value) => editor.replaceFieldDraft(activeTemplate.id, key, value)"
                @update-exif="editor.updateExif"
            />
            <ExportPanel
                :settings="exportSettings"
                :disabled="!activePhoto || ui.isExporting"
                @update="exportSettings = $event"
                @export="handleExportPhoto"
            />
            <TemplatePackageActions
                :template="activeTemplate"
                @import-template="handleImportTemplate"
                @export-template="handleExportTemplate"
            />
        </section>
    </main>
</template>
