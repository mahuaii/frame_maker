import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { createTemplatePackage, defineTemplatePackage, normalizeDataTemplatePackage } from './data-template.ts';
import type { FrameTemplate } from '../../../src/types/template';

const TEMPLATE_JSON_PATH = 'template.json';

type TemplateAsset = Uint8Array | ArrayBuffer | Blob;

function isSafeZipPath(path: unknown): path is string {
    return typeof path === 'string'
        && path
        && !path.startsWith('/')
        && !path.includes('\\')
        && !path.split('/').includes('..');
}

function getMimeType(path: string) {
    const lowerPath = path.toLowerCase();
    if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
        return 'image/jpeg';
    }

    if (lowerPath.endsWith('.png')) {
        return 'image/png';
    }

    if (lowerPath.endsWith('.webp')) {
        return 'image/webp';
    }

    return 'application/octet-stream';
}

async function readAssetBytes(asset: TemplateAsset) {
    if (asset instanceof Uint8Array) {
        return asset;
    }

    if (asset instanceof ArrayBuffer) {
        return new Uint8Array(asset);
    }

    if (asset instanceof Blob) {
        return new Uint8Array(await asset.arrayBuffer());
    }

    throw new Error('Unsupported template asset value.');
}

function normalizeAssetPath(path: unknown): string {
    if (!isSafeZipPath(path) || !path.startsWith('assets/')) {
        throw new Error(`Invalid template asset path "${path}".`);
    }

    return path;
}

export async function exportTemplatePackage(template: FrameTemplate, assets: Record<string, TemplateAsset> = {}) {
    const templatePackage = createTemplatePackage(template);
    const files = {
        [TEMPLATE_JSON_PATH]: strToU8(JSON.stringify(templatePackage, null, 2)),
    };

    for (const [rawPath, asset] of Object.entries(assets ?? {})) {
        const path = normalizeAssetPath(rawPath);
        files[path] = await readAssetBytes(asset);
    }

    const zipped = zipSync(files);
    return new Blob([zipped as BlobPart], {
        type: 'application/zip',
    });
}

export async function importTemplatePackage(file: File | Blob) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = unzipSync(bytes);
    const templateEntry = entries[TEMPLATE_JSON_PATH];

    if (!templateEntry) {
        throw new Error('模板包缺少 template.json。');
    }

    const rawPackage = JSON.parse(strFromU8(templateEntry));
    const normalizedPackage = normalizeDataTemplatePackage(rawPackage);
    const assetUrls: Record<string, string> = {};
    const releaseUrls: string[] = [];

    Object.values(normalizedPackage.template.assets ?? {}).forEach((path) => {
        if (!path) {
            return;
        }

        const assetPath = normalizeAssetPath(path);
        const entry = entries[assetPath];
        if (!entry) {
            throw new Error(`模板包缺少资源 ${assetPath}。`);
        }

        const blob = new Blob([entry as BlobPart], {
            type: getMimeType(assetPath),
        });
        const url = URL.createObjectURL(blob);
        assetUrls[assetPath] = url;
        releaseUrls.push(url);
    });

    const releaseAssets = () => {
        releaseUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    };
    const template = defineTemplatePackage(normalizedPackage, {
        sourceType: 'imported',
        assets: assetUrls,
        releaseAssets,
    });

    return {
        template,
        assets: assetUrls,
        releaseAssets,
    };
}
