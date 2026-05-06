import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { createTemplatePackage, defineDataTemplate, normalizeDataTemplatePackage } from './data-template.js';

const TEMPLATE_JSON_PATH = 'template.json';

function isSafeZipPath(path) {
    return typeof path === 'string'
        && path
        && !path.startsWith('/')
        && !path.includes('\\')
        && !path.split('/').includes('..');
}

function getMimeType(path) {
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

async function readAssetBytes(asset) {
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

function normalizeAssetPath(path) {
    if (!isSafeZipPath(path) || !path.startsWith('assets/')) {
        throw new Error(`Invalid template asset path "${path}".`);
    }

    return path;
}

export async function exportTemplatePackage(template, assets = {}) {
    const templatePackage = createTemplatePackage(template);
    const files = {
        [TEMPLATE_JSON_PATH]: strToU8(JSON.stringify(templatePackage, null, 2)),
    };

    for (const [rawPath, asset] of Object.entries(assets ?? {})) {
        const path = normalizeAssetPath(rawPath);
        files[path] = await readAssetBytes(asset);
    }

    const zipped = zipSync(files);
    return new Blob([zipped], {
        type: 'application/zip',
    });
}

export async function importTemplatePackage(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = unzipSync(bytes);
    const templateEntry = entries[TEMPLATE_JSON_PATH];

    if (!templateEntry) {
        throw new Error('模板包缺少 template.json。');
    }

    const rawPackage = JSON.parse(strFromU8(templateEntry));
    const normalizedPackage = normalizeDataTemplatePackage(rawPackage);
    const assetUrls = {};
    const releaseUrls = [];

    Object.values(normalizedPackage.template.assets ?? {}).forEach((path) => {
        if (!path) {
            return;
        }

        normalizeAssetPath(path);
        const entry = entries[path];
        if (!entry) {
            throw new Error(`模板包缺少资源 ${path}。`);
        }

        const blob = new Blob([entry], {
            type: getMimeType(path),
        });
        const url = URL.createObjectURL(blob);
        assetUrls[path] = url;
        releaseUrls.push(url);
    });

    const releaseAssets = () => {
        releaseUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    };
    const template = defineDataTemplate(normalizedPackage.template, {
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
