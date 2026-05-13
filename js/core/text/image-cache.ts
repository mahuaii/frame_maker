const imageCache = new Map();

function getImageSourceKey(source) {
    if (!source || typeof source !== 'object') {
        return null;
    }

    if (source.image) {
        return source.image;
    }

    if (!source.src) {
        return null;
    }

    return `${source.type ?? 'asset'}:${source.src}`;
}

function isLoadedImage(image) {
    return image?.complete && (image.naturalWidth || image.width) && (image.naturalHeight || image.height);
}

function loadImageElement(source) {
    return new Promise((resolve) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);

        if (source.crossOrigin) {
            image.crossOrigin = source.crossOrigin;
        }

        image.src = source.src;
    });
}

export async function loadTextImage(source) {
    const key = getImageSourceKey(source);

    if (!key) {
        return null;
    }

    if (typeof key === 'object') {
        return isLoadedImage(key) ? key : null;
    }

    if (!imageCache.has(key)) {
        imageCache.set(key, loadImageElement(source));
    }

    return imageCache.get(key);
}

export function releaseTextImageSource(source) {
    if (!source || typeof source !== 'object') {
        return;
    }

    const key = getImageSourceKey(source);
    if (typeof key === 'string') {
        imageCache.delete(key);
    }

    if (source.type === 'objectUrl' && source.src && typeof URL !== 'undefined') {
        URL.revokeObjectURL(source.src);
    }
}

export function clearTextImageCache() {
    imageCache.clear();
}
