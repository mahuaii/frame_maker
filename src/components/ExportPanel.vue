<script setup lang="ts">
import type { ExportSettings } from '../types/editor';

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
</script>

<template>
    <section class="panel-section export-panel">
        <h2>导出</h2>
        <div class="field-group">
            <label for="sizePreset">尺寸</label>
            <select
                id="sizePreset"
                :value="settings.sizePreset"
                @change="patch(settings, { sizePreset: ($event.target as HTMLSelectElement).value as ExportSettings['sizePreset'] })"
            >
                <option value="original">原始尺寸</option>
                <option value="1080">长边 1080</option>
                <option value="2048">长边 2048</option>
                <option value="custom">自定义</option>
            </select>
        </div>
        <div v-if="settings.sizePreset === 'custom'" class="custom-size-grid">
            <div class="field-group">
                <label for="customWidth">宽</label>
                <input
                    id="customWidth"
                    type="number"
                    min="1"
                    :value="settings.customWidth"
                    @input="patch(settings, { customWidth: ($event.target as HTMLInputElement).value })"
                >
            </div>
            <div class="field-group">
                <label for="customHeight">高</label>
                <input
                    id="customHeight"
                    type="number"
                    min="1"
                    :value="settings.customHeight"
                    @input="patch(settings, { customHeight: ($event.target as HTMLInputElement).value })"
                >
            </div>
        </div>
        <div class="field-group">
            <label for="jpegQuality">JPEG 质量</label>
            <input
                id="jpegQuality"
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                :value="settings.jpegQuality"
                @input="patch(settings, { jpegQuality: Number(($event.target as HTMLInputElement).value) })"
            >
        </div>
        <button class="primary-button" type="button" :disabled="disabled" @click="emit('export')">
            导出 JPG
        </button>
    </section>
</template>
