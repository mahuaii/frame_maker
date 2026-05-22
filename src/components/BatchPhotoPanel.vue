<script setup lang="ts">
import { computed } from 'vue';
import CheckboxControl from './CheckboxControl.vue';
import type { PhotoEditState } from '../types/editor';
import type { PhotoEntry } from '../types/photo';

const props = defineProps<{
    photos: PhotoEntry[];
    activePhotoId: string | null;
    photoStatesById: Record<string, PhotoEditState>;
    copiedSettingsAvailable: boolean;
}>();

const emit = defineEmits<{
    selectPhoto: [photoId: string];
    toggleExport: [photoId: string, selected: boolean];
    copySettings: [];
    pasteSettings: [];
    applySettingsToAll: [];
}>();

const selectedExportCount = computed(() => (
    props.photos.filter((photo) => props.photoStatesById[photo.id]?.selectedForExport).length
));

function formatDimensions(photo: PhotoEntry) {
    return photo.width && photo.height ? `${photo.width} × ${photo.height}` : '';
}
</script>

<template>
    <section class="inspector-section batch-photo-panel">
        <div class="inspector-section-header">
            <h2 class="inspector-section-title">照片列表</h2>
        </div>
        <div class="inspector-section-content">
            <div class="batch-actions inspector-content-contained">
                <button class="btn-small batch-action-button" type="button" :disabled="!activePhotoId" @click="emit('copySettings')">
                复制设置
                </button>
                <button
                    class="btn-small batch-action-button"
                    type="button"
                    :disabled="!activePhotoId || !copiedSettingsAvailable"
                    @click="emit('pasteSettings')"
                >
                粘贴设置
                </button>
                <button
                    class="btn-small batch-action-button"
                    type="button"
                    :disabled="!activePhotoId || photos.length === 0"
                    @click="emit('applySettingsToAll')"
                >
                应用到全部
                </button>
            </div>

            <div class="batch-summary inspector-content-contained">
                {{ photos.length > 0 ? `共 ${photos.length} 张，已选择 ${selectedExportCount} 张导出` : '尚未上传照片' }}
            </div>

            <div v-if="photos.length" class="batch-photo-list inspector-content-contained">
                <div
                    v-for="photo in photos"
                    :key="photo.id"
                    v-memo="[
                        photo.id === activePhotoId,
                        photoStatesById[photo.id]?.selectedForExport,
                        photo.thumbnailUrl,
                        photo.name,
                        photo.width,
                        photo.height
                    ]"
                    class="batch-photo-card"
                    :class="{ selected: photo.id === activePhotoId }"
                    role="button"
                    tabindex="0"
                    :aria-pressed="photo.id === activePhotoId"
                    @click="emit('selectPhoto', photo.id)"
                    @keydown.enter.prevent="emit('selectPhoto', photo.id)"
                    @keydown.space.prevent="emit('selectPhoto', photo.id)"
                >
                    <img class="batch-photo-thumbnail" :src="photo.thumbnailUrl" alt="" aria-hidden="true">
                    <span class="batch-photo-info">
                        <span class="batch-photo-name">{{ photo.name ?? '未命名照片' }}</span>
                        <span class="batch-photo-meta">{{ formatDimensions(photo) }}</span>
                    </span>
                    <CheckboxControl
                        class-name="batch-photo-check-wrap"
                        :checked="photoStatesById[photo.id]?.selectedForExport ?? false"
                        :aria-label="`选择导出 ${photo.name ?? '照片'}`"
                        @click.stop
                        @change="emit('toggleExport', photo.id, $event)"
                    />
                </div>
            </div>
        </div>
    </section>
</template>
