import { exportTemplatePackage } from '../../js/core/templates/template-package.ts';
import type { FrameTemplate } from '../types/template';

async function fetchTemplateAsset(path: string, assetUrl: string) {
    const response = await fetch(assetUrl);

    if (!response.ok) {
        throw new Error(`模板资源读取失败：${path}`);
    }

    return response.blob();
}

async function fetchTemplateAssets(template: FrameTemplate) {
    const assets: Record<string, Blob> = {};
    const assetPaths = Array.from(new Set(Object.values(template.assets ?? {}).filter(Boolean)));

    for (const path of assetPaths) {
        const assetUrl = template.importedAssets?.[path];
        if (!assetUrl) {
            throw new Error(`模板资源缺失：${path}`);
        }

        assets[path] = await fetchTemplateAsset(path, assetUrl);
    }

    return assets;
}

export async function exportTemplateZip(template: FrameTemplate) {
    const assets = await fetchTemplateAssets(template);
    const blob = await exportTemplatePackage(template, assets);

    return {
        blob,
        filename: `${template.id}.frame-template.zip`,
    };
}
