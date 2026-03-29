import { getTemplateById } from '../js/templates.js';
import { loadRuntimeFonts } from '../js/core/fonts/index.js';
import { renderFrame, createPhotoSource } from '../js/renderer.js';
import { resolveTemplateConfig } from '../js/core/templates/registry.js';

function updateStatus(message) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
    }
}

function setThumbnailData(dataUrl) {
    const output = document.getElementById('thumbnail-data');
    if (output) {
        output.value = dataUrl;
    }
}

async function loadSamplePhoto(samplePath) {
    const sampleUrl = new URL(samplePath, `${window.location.origin}/`);
    const response = await fetch(sampleUrl);
    if (!response.ok) {
        throw new Error(`Failed to load sample photo: ${response.status}`);
    }

    const blob = await response.blob();
    const fileName = sampleUrl.pathname.split('/').pop() || 'thumbnail-source.jpg';
    const file = new File([blob], fileName, {
        type: blob.type || 'image/jpeg',
    });

    const imageUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    image.src = imageUrl;

    try {
        if (typeof image.decode === 'function') {
            await image.decode();
        } else {
            await new Promise((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error('Sample image failed to decode.'));
            });
        }
    } finally {
        URL.revokeObjectURL(imageUrl);
    }

    return {
        file,
        image,
    };
}

async function generateThumbnail() {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get('templateId');
    const samplePath = params.get('sample') || 'assets/samples/thumbnail-source-z30.jpg';
    const maxWidth = Number(params.get('maxWidth') || 540);
    const maxHeight = Number(params.get('maxHeight') || 405);

    if (!templateId) {
        throw new Error('Missing templateId query param.');
    }

    const template = getTemplateById(templateId);
    if (!template) {
        throw new Error(`Unknown template: ${templateId}`);
    }

    updateStatus(`loading:${templateId}`);
    await loadRuntimeFonts();

    const { file, image } = await loadSamplePhoto(samplePath);
    const fullSizeCanvas = document.createElement('canvas');

    await renderFrame(
        fullSizeCanvas,
        image,
        template,
        resolveTemplateConfig(template, template.defaultConfig),
        {
            scale: 1,
            mode: 'thumbnail',
            photo: createPhotoSource({ file, image }),
        }
    );

    const scale = Math.min(
        maxWidth / fullSizeCanvas.width,
        maxHeight / fullSizeCanvas.height,
        1
    );
    const outputWidth = Math.max(Math.round(fullSizeCanvas.width * scale), 1);
    const outputHeight = Math.max(Math.round(fullSizeCanvas.height * scale), 1);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create output canvas context.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fullSizeCanvas, 0, 0, outputWidth, outputHeight);

    document.body.style.margin = '0';
    document.body.style.width = `${outputWidth}px`;
    document.body.style.height = `${outputHeight}px`;

    setThumbnailData(outputCanvas.toDataURL('image/png'));
    updateStatus(`ready:${templateId}:${outputWidth}x${outputHeight}`);
}

generateThumbnail().catch((error) => {
    updateStatus(`error:${error instanceof Error ? error.message : String(error)}`);
});
