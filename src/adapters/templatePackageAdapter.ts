import {
    exportTemplatePackage,
    importTemplatePackage,
} from '../../js/core/templates/template-package.ts';
import type { FrameTemplate } from '../types/template';

function getBuiltinThumbnailUrl(template: FrameTemplate) {
    return new URL(`../../thumbnails/${template.id}_thumbnail.jpg`, import.meta.url).toString();
}

async function fetchThumbnailAsset(template: FrameTemplate) {
    const thumbnailPath = template.assets?.thumbnail;
    if (!thumbnailPath) {
        return {};
    }

    const assetUrl = template.importedAssets?.[thumbnailPath] ?? getBuiltinThumbnailUrl(template);
    const response = await fetch(assetUrl);

    if (!response.ok) {
        return {};
    }

    return {
        [thumbnailPath]: await response.blob(),
    };
}

export async function exportTemplateZip(template: FrameTemplate) {
    const assets = await fetchThumbnailAsset(template);
    const blob = await exportTemplatePackage(template, assets);

    return {
        blob,
        filename: `${template.id}.frame-template.zip`,
    };
}

export async function importTemplateZip(file: File) {
    return importTemplatePackage(file);
}
