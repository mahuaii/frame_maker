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
    const importedPath = template.assets?.thumbnail;
    if (importedPath && template.importedAssets?.[importedPath]) {
        return template.importedAssets[importedPath];
    }

    return new URL(`../../thumbnails/${template.id}_thumbnail.jpg`, import.meta.url).toString();
}
</script>

<template>
    <aside class="template-list">
        <h1>Frame Maker</h1>
        <button
            v-for="template in templates"
            :key="template.id"
            class="template-item"
            :class="{ 'is-selected': template.id === selectedTemplateId }"
            type="button"
            @click="emit('select', template)"
        >
            <img :src="thumbnailUrl(template)" alt="" loading="lazy">
            <span>{{ template.label ?? template.id }}</span>
        </button>
    </aside>
</template>
