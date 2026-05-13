import { resolveResizeDimensions } from '../core/render/sizing.js';
import { calculateFrameMetrics, renderFrame } from '../renderer.js';
import { createElement, createFieldGroup } from '../ui/controls.js';
import {
    DEFAULT_EXPORT_SETTINGS,
    MAX_JPEG_QUALITY,
    MIN_JPEG_QUALITY,
} from './constants.js';

function clampJpegQuality(value) {
    const quality = Number(value);

    if (!Number.isFinite(quality)) {
        return DEFAULT_EXPORT_SETTINGS.jpegQuality;
    }

    return Math.min(Math.max(quality, MIN_JPEG_QUALITY), MAX_JPEG_QUALITY);
}

function parseJpegQualityInput(value) {
    const rawValue = typeof value === 'string' ? value.trim() : value;

    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? clampJpegQuality(rawValue) : null;
    }

    if (typeof rawValue !== 'string') {
        return null;
    }

    const matchedValue = rawValue.match(/^(\d+(?:\.\d+)?)(%)?$/);

    if (!matchedValue) {
        return null;
    }

    const percentage = Number(matchedValue[1]);

    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
        return null;
    }

    return percentage / 100;
}

function formatJpegQualityLabel(quality) {
    return `${Number((clampJpegQuality(quality) * 100).toFixed(2))}%`;
}

function buildJpegQualityOptions() {
    const options = [];

    for (let quality = 100; quality >= 70; quality -= 5) {
        options.push({
            value: quality / 100,
            label: `${quality}%`,
        });
    }

    return options;
}

const EXPORT_FIELDS = [
    {
        key: 'sizePreset',
        label: '尺寸',
        type: 'select',
        defaultValue: DEFAULT_EXPORT_SETTINGS.sizePreset,
        groupClassName: 'export-field export-size-field field-frame-gray',
        options: [
            { value: 'original', label: '原始尺寸' },
            { value: '1080', label: '长边 1080px' },
            { value: '2048', label: '长边 2048px' },
            { value: 'custom', label: '自定义' },
        ],
    },
    {
        key: 'customWidth',
        label: 'W',
        type: 'number',
        min: 1,
        step: 1,
        inputMode: 'numeric',
        placeholder: '宽度',
    },
    {
        key: 'customHeight',
        label: 'H',
        type: 'number',
        min: 1,
        step: 1,
        inputMode: 'numeric',
        placeholder: '高度',
    },
    {
        key: 'jpegQuality',
        label: 'JPEG 质量',
        type: 'option-input',
        inputMode: 'numeric',
        defaultValue: DEFAULT_EXPORT_SETTINGS.jpegQuality,
        groupClassName: 'export-field export-quality-field field-frame-gray',
        formatValue: formatJpegQualityLabel,
        parseValue: parseJpegQualityInput,
        options: buildJpegQualityOptions(),
    },
];

export function createExportController({ state, getTemplateById }) {
    let exportSettings = { ...DEFAULT_EXPORT_SETTINGS };
    let exportControlsRoot = null;
    let exportCustomSize = null;
    let closeActiveExportMenu = null;

    function getExtensionForMimeType(mimeType) {
        switch (mimeType) {
            case 'image/png':
                return 'png';
            case 'image/webp':
                return 'webp';
            case 'image/jpeg':
            default:
                return 'jpg';
        }
    }

    function buildExportFilename(photoName, mimeType) {
        const fallbackBaseName = 'frame_maker_export';
        const sourceName = typeof photoName === 'string' ? photoName.trim() : '';
        const lastDotIndex = sourceName.lastIndexOf('.');
        const hasExtension = lastDotIndex > 0;
        const baseName = hasExtension ? sourceName.slice(0, lastDotIndex) : sourceName;
        const normalizedBaseName = (baseName || fallbackBaseName).trim() || fallbackBaseName;
        const extension = getExtensionForMimeType(mimeType);

        return `${normalizedBaseName}_framed.${extension}`;
    }

    function syncExportControls() {
        if (!exportControlsRoot) {
            return;
        }

        const exportSizePreset = exportControlsRoot.querySelector('[data-field-key="sizePreset"]');
        const exportWidthInput = exportControlsRoot.querySelector('[data-field-key="customWidth"]');
        const exportHeightInput = exportControlsRoot.querySelector('[data-field-key="customHeight"]');
        const exportQualityInput = exportControlsRoot.querySelector('[data-field-key="jpegQuality"]');

        if (exportSizePreset) exportSizePreset.value = exportSettings.sizePreset;
        if (exportWidthInput) exportWidthInput.value = exportSettings.customWidth;
        if (exportHeightInput) exportHeightInput.value = exportSettings.customHeight;
        if (exportQualityInput) exportQualityInput.value = formatJpegQualityLabel(exportSettings.jpegQuality);
        exportCustomSize?.classList.toggle('hidden', exportSettings.sizePreset !== 'custom');
    }

    function setExportSizePreset(sizePreset) {
        exportSettings = {
            ...exportSettings,
            sizePreset,
        };
        syncExportControls();
    }

    function setCustomExportDimension(key, rawValue) {
        exportSettings = {
            ...exportSettings,
            [key]: rawValue === '' ? '' : rawValue,
        };
        syncExportControls();
    }

    function setJpegQuality(rawValue) {
        const jpegQuality = typeof rawValue === 'string'
            ? parseJpegQualityInput(rawValue)
            : clampJpegQuality(rawValue);

        if (jpegQuality === null) {
            syncExportControls();
            return;
        }

        exportSettings = {
            ...exportSettings,
            jpegQuality,
        };
        syncExportControls();
    }

    function commitExportFieldValue(field, nextValue) {
        switch (field.key) {
            case 'sizePreset':
                setExportSizePreset(nextValue);
                break;
            case 'customWidth':
                setCustomExportDimension('customWidth', String(nextValue).trim());
                break;
            case 'customHeight':
                setCustomExportDimension('customHeight', String(nextValue).trim());
                break;
            case 'jpegQuality':
                setJpegQuality(nextValue);
                break;
            default:
                break;
        }
    }

    function createExportControls() {
        const controls = createElement('div', {
            className: 'export-controls',
        });
        const fieldOptions = {
            values: exportSettings,
            idPrefix: 'export',
            onChange: commitExportFieldValue,
        };
        const sizePresetField = EXPORT_FIELDS.find((field) => field.key === 'sizePreset');
        const customWidthField = EXPORT_FIELDS.find((field) => field.key === 'customWidth');
        const customHeightField = EXPORT_FIELDS.find((field) => field.key === 'customHeight');
        const jpegQualityField = EXPORT_FIELDS.find((field) => field.key === 'jpegQuality');

        exportControlsRoot = controls;
        exportCustomSize = createElement('div', {
            className: 'export-custom-size inspector-field-grid inspector-field-grid-contained',
            attributes: {
                id: 'export-custom-size',
            },
            children: [
                createFieldGroup(customWidthField, fieldOptions),
                createFieldGroup(customHeightField, fieldOptions),
            ],
        });
        const primaryFields = createElement('div', {
            className: 'export-primary-fields',
            children: [
                createFieldGroup(sizePresetField, fieldOptions),
                createFieldGroup(jpegQualityField, fieldOptions),
            ],
        });

        controls.append(
            primaryFields,
            exportCustomSize,
        );
        syncExportControls();

        return controls;
    }

    function getBaseExportDimensions(template, image, values) {
        const metrics = calculateFrameMetrics(image, template, 1, values);
        return {
            width: metrics.fullWidth,
            height: metrics.fullHeight,
        };
    }

    function resolveExportResize(template, image, values) {
        return resolveResizeDimensions({
            sizePreset: exportSettings.sizePreset,
            customWidth: exportSettings.customWidth,
            customHeight: exportSettings.customHeight,
            baseDimensions: getBaseExportDimensions(template, image, values),
        });
    }

    function canvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, mimeType, quality);
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 0);
    }

    async function exportPhotoEntry(entry) {
        const template = getTemplateById(entry.selectedTemplateId);
        if (!template) {
            return false;
        }

        const entryFieldValues = state.getPhotoEntryTemplateFieldValues(entry, template);
        const entryTextModel = state.getPhotoEntryTextModel(entry, template);
        const tempCanvas = document.createElement('canvas');
        const resize = resolveExportResize(template, entry.image, entryFieldValues);

        const renderResult = await renderFrame(tempCanvas, entry.image, template, entryFieldValues, {
            scale: 1,
            mode: 'export',
            photo: entry.photo,
            exifOverrides: entry.exifOverrideValues,
            textModel: entryTextModel,
            global: {
                resize,
                compression: {
                    mimeType: exportSettings.format,
                    quality: clampJpegQuality(exportSettings.jpegQuality),
                },
            },
        });

        const exportCanvas = renderResult?.processedCanvas ?? tempCanvas;
        const compression = renderResult?.global?.compression ?? {
            mimeType: DEFAULT_EXPORT_SETTINGS.format,
            quality: DEFAULT_EXPORT_SETTINGS.jpegQuality,
        };

        const blob = await canvasToBlob(exportCanvas, compression.mimeType, compression.quality);
        if (!blob) {
            return false;
        }

        downloadBlob(blob, buildExportFilename(entry.photo?.name, compression.mimeType));
        return true;
    }

    async function handleExport() {
        const { photoEntries } = state.getCurrentSnapshot();

        if (photoEntries.length === 0) {
            alert('请先上传照片');
            return;
        }

        state.saveActivePhotoState();

        const selectedEntries = photoEntries.filter((entry) => entry.selectedForExport);
        if (selectedEntries.length === 0) {
            alert('请先在批量面板选择要导出的照片');
            return;
        }

        try {
            for (const entry of selectedEntries) {
                const exported = await exportPhotoEntry(entry);
                if (!exported) {
                    throw new Error('导出失败，请重试');
                }
            }
        } catch (error) {
            alert(error.message || '导出尺寸无效，请检查后重试');
        }
    }

    function setCloseActiveExportMenu(closeMenu) {
        closeActiveExportMenu = closeMenu;
    }

    function clearCloseActiveExportMenu(closeMenu) {
        if (closeActiveExportMenu === closeMenu) {
            closeActiveExportMenu = null;
        }
    }

    function closeExportMenu() {
        closeActiveExportMenu?.();
    }

    return {
        createExportControls,
        syncExportControls,
        handleExport,
        setCloseActiveExportMenu,
        clearCloseActiveExportMenu,
        closeExportMenu,
    };
}
