<script setup lang="ts">
import { computed } from 'vue';
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
    return photo.width && photo.height ? `${photo.width} x ${photo.height}` : '';
}
</script>

<template>
    <section class="panel-section batch-photo-panel">
        <header class="panel-section-header">
            <h2>照片列表</h2>
            <span>{{ photos.length }} 张 / {{ selectedExportCount }} 张导出</span>
        </header>

        <div class="batch-actions">
            <button class="secondary-button" type="button" :disabled="!activePhotoId" @click="emit('copySettings')">
                复制设置
            </button>
            <button
                class="secondary-button"
                type="button"
                :disabled="!activePhotoId || !copiedSettingsAvailable"
                @click="emit('pasteSettings')"
            >
                粘贴设置
            </button>
            <button
                class="secondary-button"
                type="button"
                :disabled="!activePhotoId || photos.length === 0"
                @click="emit('applySettingsToAll')"
            >
                应用到全部
            </button>
        </div>

        <div v-if="photos.length" class="batch-photo-list">
            <article
                v-for="photo in photos"
                :key="photo.id"
                class="batch-photo-card"
                :class="{ 'is-active': photo.id === activePhotoId }"
            >
                <button type="button" class="batch-photo-select" @click="emit('selectPhoto', photo.id)">
                    <img :src="photo.objectUrl" alt="">
                    <span class="batch-photo-info">
                        <strong>{{ photo.name ?? '未命名照片' }}</strong>
                        <span>{{ formatDimensions(photo) }}</span>
                    </span>
                </button>
                <label class="batch-export-toggle">
                    <input
                        type="checkbox"
                        :checked="photoStatesById[photo.id]?.selectedForExport ?? false"
                        @change="emit('toggleExport', photo.id, ($event.target as HTMLInputElement).checked)"
                    >
                    导出
                </label>
            </article>
        </div>

        <p v-else class="batch-empty">尚未上传照片</p>
    </section>
</template>
