import { exportTemplatePackage, importTemplatePackage } from '../core/templates/template-package.js';
import { createElement } from '../ui/controls.js';

function getFileInputFiles(event) {
    const input = event?.target;
    return input && 'files' in input ? input.files : null;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function fetchTemplateAssets(template) {
    const thumbnailPath = template.assets?.thumbnail;
    if (!thumbnailPath) {
        return {};
    }

    if (template.importedAssets?.[thumbnailPath]) {
        const response = await fetch(template.importedAssets[thumbnailPath]);
        return response.ok ? { [thumbnailPath]: await response.blob() } : {};
    }

    const thumbnailUrls = [
        `thumbnails/${template.id}_thumbnail.jpg`,
        `thumbnails/${template.id}_thumbnail.png`,
    ];

    for (const url of thumbnailUrls) {
        const response = await fetch(url);
        if (response.ok) {
            return { [thumbnailPath]: await response.blob() };
        }
    }

    return {};
}

async function handleExportTemplate({ state, getTemplateById }) {
    const { selectedTemplateId } = state.getCurrentSnapshot();
    const template = getTemplateById(selectedTemplateId);
    if (!template) {
        alert('当前模板不可导出');
        return;
    }

    try {
        const blob = await exportTemplatePackage(template, await fetchTemplateAssets(template));
        downloadBlob(blob, `${template.id}.frame-template.zip`);
    } catch (error) {
        alert(error?.message || '模板导出失败');
    }
}

async function handleImportTemplate({ file, addImportedTemplate, state, actions, getTemplateById }) {
    if (typeof addImportedTemplate !== 'function') {
        alert('当前环境不支持导入模板');
        return;
    }

    try {
        const { template } = await importTemplatePackage(file);
        const importedTemplate = addImportedTemplate(template);
        state.saveActivePhotoState();
        state.setSelectedTemplateId(importedTemplate.id);
        state.setFieldValues(state.getTemplateFieldValues(importedTemplate));
        state.setSelectedTextObjectId(state.getTemplateTextModel(importedTemplate)[0]?.id ?? null);
        state.saveActivePhotoState();
        actions.renderSelectorList();
        actions.updateSelectorSelection();
        actions.renderInspector();
        await actions.updatePreview();
    } catch (error) {
        alert(error?.message || '模板导入失败');
    }
}

export function createTemplatePackageActions(context) {
    const fileInput = createElement('input', {
        attributes: {
            type: 'file',
            accept: '.zip,.frame-template.zip,application/zip',
            hidden: true,
        },
    });
    const importButton = createElement('button', {
        className: 'btn inspector-template-package-button',
        textContent: '导入模板',
        attributes: {
            type: 'button',
        },
    });
    const exportButton = createElement('button', {
        className: 'btn inspector-template-package-button',
        textContent: '导出模板',
        attributes: {
            type: 'button',
        },
    });
    const wrapper = createElement('div', {
        className: 'template-package-actions',
        children: [
            importButton,
            exportButton,
            fileInput,
        ],
    });

    importButton.addEventListener('click', () => {
        fileInput.click();
    });
    exportButton.addEventListener('click', () => {
        handleExportTemplate(context);
    });
    fileInput.addEventListener('change', (event) => {
        const input = event.target;
        const file = getFileInputFiles(event)?.[0];
        if (input && 'value' in input) {
            input.value = '';
        }
        if (file) {
            handleImportTemplate({
                ...context,
                file,
            });
        }
    });

    return wrapper;
}
