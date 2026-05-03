import { createElement } from '../../ui/controls.js';
import {
    createInspectorSection,
    getInspectorSectionContent,
} from '../../ui/inspector.js';

function formatPhotoMeta(entry) {
    const width = entry.photo?.width ?? 0;
    const height = entry.photo?.height ?? 0;

    if (!width || !height) {
        return '';
    }

    return `${width} × ${height}`;
}

function setPhotoExportSelection({ state, actions }, photoId, isSelected) {
    state.setPhotoExportSelection(photoId, isSelected);
    actions.renderInspector();
}

function handlePhotoCardSelect({ state, actions }, photoId) {
    const { photoEntries, activePhotoId } = state.getCurrentSnapshot();
    const entry = photoEntries.find((item) => item.id === photoId);
    if (!entry || entry.id === activePhotoId) {
        return;
    }

    state.saveActivePhotoState();
    actions.activatePhotoEntry(entry);
}

function copyCurrentPhotoSettings({ state, actions }) {
    const entry = state.getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    state.saveActivePhotoState();
    state.setCopiedBatchSettings(state.createBatchSettingsSnapshot(entry));
    actions.renderInspector();
}

function pasteCopiedSettingsToCurrentPhoto({ state, actions }) {
    const { copiedBatchSettings } = state.getCurrentSnapshot();
    if (!copiedBatchSettings) {
        alert('请先复制当前照片设置');
        return;
    }

    const entry = state.getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    state.saveActivePhotoState();
    state.applyBatchSettingsSnapshot(entry, copiedBatchSettings);
    actions.activatePhotoEntry(entry);
}

function applyCurrentPhotoSettingsToAllPhotos({ state, actions }) {
    const entry = state.getActivePhotoEntry();
    if (!entry) {
        alert('请先上传照片');
        return;
    }

    state.saveActivePhotoState();
    const sourceSettings = state.createBatchSettingsSnapshot(entry);

    state.getCurrentSnapshot().photoEntries.forEach((photoEntry) => {
        state.applyBatchSettingsSnapshot(photoEntry, sourceSettings);
    });

    const activeEntry = state.getActivePhotoEntry();
    if (activeEntry) {
        actions.activatePhotoEntry(activeEntry);
        return;
    }

    actions.renderInspector();
}

function createBatchPhotoCard(context, entry) {
    const { state } = context;
    const { activePhotoId } = state.getCurrentSnapshot();
    const isActive = entry.id === activePhotoId;
    const checkbox = createElement('input', {
        className: 'batch-photo-checkbox',
        attributes: {
            type: 'checkbox',
            checked: entry.selectedForExport,
            'aria-label': `选择导出 ${entry.photo?.name ?? '照片'}`,
        },
    });
    const thumbnail = createElement('img', {
        className: 'batch-photo-thumbnail',
        attributes: {
            alt: '',
            'aria-hidden': 'true',
            src: entry.objectUrl,
        },
    });
    const name = createElement('span', {
        className: 'batch-photo-name',
        textContent: entry.photo?.name ?? '未命名照片',
    });
    const meta = createElement('span', {
        className: 'batch-photo-meta',
        textContent: formatPhotoMeta(entry),
    });
    const card = createElement('div', {
        className: `batch-photo-card${isActive ? ' selected' : ''}`,
        attributes: {
            role: 'button',
            tabindex: '0',
            'aria-pressed': isActive ? 'true' : 'false',
        },
        dataset: {
            photoId: entry.id,
        },
        children: [
            thumbnail,
            createElement('span', {
                className: 'batch-photo-info',
                children: [name, meta],
            }),
            createElement('span', {
                className: 'checkbox-field batch-photo-check-wrap',
                children: [checkbox],
            }),
        ],
    });

    checkbox.parentElement?.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    checkbox.addEventListener('change', (event) => {
        setPhotoExportSelection(context, entry.id, event.target.checked);
    });
    card.addEventListener('click', () => {
        handlePhotoCardSelect(context, entry.id);
    });
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePhotoCardSelect(context, entry.id);
        }
    });

    return card;
}

export function createBatchPhotoPanel(context) {
    const { state } = context;
    const { photoEntries, activePhotoId, copiedBatchSettings } = state.getCurrentSnapshot();
    const selectedCount = photoEntries.filter((entry) => entry.selectedForExport).length;
    const section = createInspectorSection('照片列表');
    const content = getInspectorSectionContent(section);
    const actions = createElement('div', {
        className: 'batch-actions inspector-content-contained',
        children: [
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '复制设置',
                attributes: {
                    type: 'button',
                    disabled: !activePhotoId,
                },
            }),
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '粘贴设置',
                attributes: {
                    type: 'button',
                    disabled: !copiedBatchSettings || !activePhotoId,
                },
            }),
            createElement('button', {
                className: 'btn-small text-object-action batch-action-button',
                textContent: '应用到全部',
                attributes: {
                    type: 'button',
                    disabled: !activePhotoId || photoEntries.length === 0,
                },
            }),
        ],
    });
    const summary = createElement('div', {
        className: 'batch-summary inspector-content-contained',
        textContent: photoEntries.length > 0
            ? `共 ${photoEntries.length} 张，已选择 ${selectedCount} 张导出`
            : '尚未上传照片',
    });
    const list = createElement('div', {
        className: 'batch-photo-list inspector-content-contained',
    });

    actions.children[0].addEventListener('click', () => copyCurrentPhotoSettings(context));
    actions.children[1].addEventListener('click', () => pasteCopiedSettingsToCurrentPhoto(context));
    actions.children[2].addEventListener('click', () => applyCurrentPhotoSettingsToAllPhotos(context));

    if (photoEntries.length > 0) {
        photoEntries.forEach((entry) => {
            list.appendChild(createBatchPhotoCard(context, entry));
        });
    }

    content.append(actions, summary, list);
    return section;
}
