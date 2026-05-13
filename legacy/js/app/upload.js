import {
    createEditableExifOverrideValues,
    createPhotoSource,
    extractExifData,
} from '../renderer.js';
import {
    createImageThumbnailObjectUrl,
    resolveThumbnailBackgroundColor,
} from '../core/render/thumbnail.js';
import { createElement } from '../ui/controls.js';
import {
    UPLOAD_NOTICE_DURATION,
    UPLOAD_NOTICE_FADE_DURATION,
} from './constants.js';

export function createUploadController({ dom, state, actions }) {
    let uploadNoticeElement = null;
    let uploadNoticeHideTimer = null;
    let uploadNoticeDisplayTimer = null;

    function getPhotoEntryFileName(entry) {
        return entry?.file?.name || entry?.photo?.name || '';
    }

    function getUploadedPhotoFileNames() {
        const { photoEntries } = state.getCurrentSnapshot();
        return new Set(photoEntries.map(getPhotoEntryFileName).filter(Boolean));
    }

    function filterDuplicateImageFiles(files) {
        const usedFileNames = getUploadedPhotoFileNames();
        const acceptedFiles = [];
        const duplicateNames = [];

        files.forEach((file) => {
            const fileName = file?.name || '';

            if (fileName && usedFileNames.has(fileName)) {
                duplicateNames.push(fileName);
                return;
            }

            acceptedFiles.push(file);

            if (fileName) {
                usedFileNames.add(fileName);
            }
        });

        return { acceptedFiles, duplicateNames };
    }

    function formatDuplicateUploadNotice(duplicateNames) {
        const duplicateCount = duplicateNames.length;
        return `已忽略 ${duplicateCount} 张重名照片`;
    }

    function getUploadNoticeElement() {
        if (uploadNoticeElement) {
            return uploadNoticeElement;
        }

        uploadNoticeElement = createElement('div', {
            className: 'upload-notice',
            attributes: {
                id: 'upload-notice',
                role: 'status',
                'aria-live': 'polite',
                hidden: true,
            },
        });
        dom.previewArea.appendChild(uploadNoticeElement);

        return uploadNoticeElement;
    }

    function showUploadNotice(message) {
        if (!message) {
            return;
        }

        const notice = getUploadNoticeElement();
        notice.textContent = message;
        notice.hidden = false;

        window.clearTimeout(uploadNoticeHideTimer);
        window.clearTimeout(uploadNoticeDisplayTimer);

        window.requestAnimationFrame(() => {
            notice.classList.add('visible');
        });

        uploadNoticeHideTimer = window.setTimeout(() => {
            notice.classList.remove('visible');
            uploadNoticeDisplayTimer = window.setTimeout(() => {
                notice.hidden = true;
            }, UPLOAD_NOTICE_FADE_DURATION);
        }, UPLOAD_NOTICE_DURATION);
    }

    function loadImageFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('invalid-file'));
                return;
            }

            const image = new Image();
            const objectUrl = URL.createObjectURL(file);
            state.registerObjectUrl(objectUrl);

            image.onload = async () => {
                let thumbnailUrl = objectUrl;

                try {
                    thumbnailUrl = await createImageThumbnailObjectUrl(image, {
                        backgroundColor: resolveThumbnailBackgroundColor([
                            '--color-bg-preview',
                            '--color-bg-elevated',
                        ]),
                    });
                    state.registerObjectUrl(thumbnailUrl);
                } catch (error) {
                    console.warn('Failed to create thumbnail image.', error);
                }

                resolve({
                    file,
                    image,
                    objectUrl,
                    thumbnailUrl,
                });
            };
            image.onerror = () => {
                state.releaseObjectUrl(objectUrl);
                reject(new Error('load-failed'));
            };
            image.src = objectUrl;
        });
    }

    async function createPhotoEntryFromFile(file) {
        const loaded = await loadImageFile(file);
        const photo = createPhotoSource({
            file: loaded.file,
            image: loaded.image,
        });
        const extractedExif = await extractExifData(photo);
        const exifOverrideSnapshot = createEditableExifOverrideValues(extractedExif);

        return state.createPhotoEntry({
            ...loaded,
            photo,
            exifOverrideSnapshot,
        });
    }

    async function handleFileSelect(files) {
        const imageFiles = Array.from(files ?? []).filter((file) => file?.type?.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('请选择有效的图片文件');
            return;
        }

        const { acceptedFiles, duplicateNames } = filterDuplicateImageFiles(imageFiles);

        if (duplicateNames.length > 0) {
            showUploadNotice(formatDuplicateUploadNotice(duplicateNames));
        }

        if (acceptedFiles.length === 0) {
            return;
        }

        state.saveActivePhotoState();

        const loadedEntries = [];
        for (const file of acceptedFiles) {
            try {
                loadedEntries.push(await createPhotoEntryFromFile(file));
            } catch (error) {
                console.warn('Failed to load image file.', error);
            }
        }

        if (loadedEntries.length === 0) {
            alert('图片加载失败，请重试');
            return;
        }

        const shouldActivateFirstNewPhoto = !state.getCurrentSnapshot().activePhotoId;
        state.addPhotoEntries(loadedEntries);

        if (shouldActivateFirstNewPhoto) {
            actions.activatePhotoEntry(loadedEntries[0]);
            return;
        }

        actions.renderInspector();
    }

    function setupDragDrop() {
        dom.previewArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dom.previewArea.classList.add('drag-over');
        });

        dom.previewArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dom.previewArea.classList.remove('drag-over');
        });

        dom.previewArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dom.previewArea.classList.remove('drag-over');

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                handleFileSelect(files);
            }
        });
    }

    return {
        handleFileSelect,
        setupDragDrop,
    };
}
