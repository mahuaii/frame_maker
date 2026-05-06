import { onBeforeUnmount, ref } from 'vue';
import {
    createEditableExifOverrideValues,
    createPhotoSource,
    extractExifData,
} from '../adapters/exifAdapter';
import {
    createImageThumbnailObjectUrl,
} from '../../js/core/render/thumbnail.js';
import type { PhotoEntry } from '../types/photo';

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片加载失败'));
        image.src = objectUrl;
    });
}

export function usePhotoStore() {
    const photos = ref<PhotoEntry[]>([]);

    async function addPhoto(file: File) {
        const objectUrl = URL.createObjectURL(file);
        let thumbnailUrl = objectUrl;

        try {
            const image = await loadImage(objectUrl);
            try {
                thumbnailUrl = await createImageThumbnailObjectUrl(image);
            } catch (error) {
                console.warn('Failed to create thumbnail image.', error);
            }

            const photoSource = createPhotoSource({ file, image });
            const originalExif = await extractExifData(photoSource);
            const entry: PhotoEntry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                objectUrl,
                thumbnailUrl,
                image,
                width: photoSource.width,
                height: photoSource.height,
                name: photoSource.name,
                type: photoSource.type,
                size: photoSource.size,
                originalExif,
            };

            photos.value = [...photos.value, entry];

            return {
                entry,
                exifOverrides: createEditableExifOverrideValues(originalExif),
            };
        } catch (error) {
            URL.revokeObjectURL(objectUrl);
            if (thumbnailUrl !== objectUrl) {
                URL.revokeObjectURL(thumbnailUrl);
            }
            throw error;
        }
    }

    async function addPhotos(files: File[]) {
        const loaded = [];

        for (const file of files) {
            try {
                loaded.push(await addPhoto(file));
            } catch (error) {
                console.warn('Failed to load image file.', error);
            }
        }

        if (loaded.length === 0) {
            throw new Error('图片加载失败');
        }

        return loaded;
    }

    function getPhotoById(id: string | null) {
        return photos.value.find((photo) => photo.id === id) ?? null;
    }

    function clear() {
        const objectUrls = new Set<string>();
        photos.value.forEach((photo) => {
            objectUrls.add(photo.objectUrl);
            objectUrls.add(photo.thumbnailUrl);
        });
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        photos.value = [];
    }

    onBeforeUnmount(clear);

    return {
        photos,
        addPhoto,
        addPhotos,
        getPhotoById,
        clear,
    };
}
