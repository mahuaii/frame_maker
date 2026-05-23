<script setup lang="ts">
import type { FrameTemplate } from '../types/template';

defineProps<{
    templates: FrameTemplate[];
    selectedTemplateId: string;
}>();

const emit = defineEmits<{
    select: [template: FrameTemplate];
}>();

function thumbnailUrl(template: FrameTemplate) {
    const thumbnailPath = template.assets?.thumbnail;
    return thumbnailPath ? template.importedAssets?.[thumbnailPath] ?? '' : '';
}
</script>

<template>
    <aside class="frame-selector">
        <h1 class="selector-title">Frame Maker</h1>
        <div class="selector-list">
        <button
            v-for="template in templates"
            :key="template.id"
            class="template-card"
            :class="{ selected: template.id === selectedTemplateId }"
            type="button"
            :aria-label="template.label ?? template.id"
            :title="template.label ?? template.id"
            @click="emit('select', template)"
        >
            <img class="template-thumbnail" :src="thumbnailUrl(template)" alt="" loading="lazy">
        </button>
        </div>
    </aside>
</template>
