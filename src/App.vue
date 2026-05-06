<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { initFrameMakerApp } from '../js/app.js';
import { getTemplateById, templates } from '../js/templates.js';

let appInstance: ReturnType<typeof initFrameMakerApp> | null = null;

onMounted(() => {
    appInstance = initFrameMakerApp({
        templates,
        getTemplateById,
    });
});

onBeforeUnmount(() => {
    appInstance?.destroy();
    appInstance = null;
});
</script>

<template>
    <main class="main-content">
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

    <input type="file" id="file-input" accept="image/*" multiple hidden>
</template>
