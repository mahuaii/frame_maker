import { createElement, createIcon } from '../../ui/controls.js';
import { UPLOAD_ICON_PATHS } from '../constants.js';

function createUploadButton({ dom }) {
    const icon = createIcon(UPLOAD_ICON_PATHS, {
        viewBox: '0 0 24 24',
        attributes: {
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
        },
    });
    const button = createElement('button', {
        className: 'btn inspector-upload-button',
        attributes: {
            type: 'button',
            'aria-label': '上传照片',
            title: '上传照片',
        },
        children: [icon],
    });

    button.addEventListener('click', () => {
        dom.fileInput.click();
    });

    return button;
}

function createExportButton({ actions, exportController }) {
    const menuId = 'export-settings-menu';
    const wrapper = createElement('div', {
        className: 'export-split-button',
    });
    const actionButton = createElement('button', {
        className: 'export-split-action',
        attributes: {
            type: 'button',
            id: 'btn-export',
        },
        children: [
            createElement('span', {
                textContent: '导出',
            }),
        ],
    });
    const toggleButton = createElement('button', {
        className: 'export-menu-toggle',
        attributes: {
            type: 'button',
            'aria-label': '展开导出设置',
            'aria-controls': menuId,
            'aria-expanded': 'false',
            title: '导出设置',
        },
    });
    const menu = createElement('div', {
        className: 'export-settings-menu',
        attributes: {
            id: menuId,
            hidden: true,
        },
        children: [
            exportController.createExportControls(),
        ],
    });

    function removeMenuListeners() {
        document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
        document.removeEventListener('keydown', handleDocumentKeyDown);
    }

    function closeMenu({ restoreFocus = false } = {}) {
        if (menu.hidden) {
            return;
        }

        menu.hidden = true;
        wrapper.classList.remove('is-open');
        toggleButton.setAttribute('aria-expanded', 'false');
        removeMenuListeners();
        exportController.clearCloseActiveExportMenu(closeMenu);

        if (restoreFocus) {
            toggleButton.focus();
        }
    }

    function openMenu() {
        exportController.closeExportMenu();
        exportController.syncExportControls();
        menu.hidden = false;
        wrapper.classList.add('is-open');
        toggleButton.setAttribute('aria-expanded', 'true');
        exportController.setCloseActiveExportMenu(closeMenu);
        document.addEventListener('pointerdown', handleDocumentPointerDown, true);
        document.addEventListener('keydown', handleDocumentKeyDown);
    }

    function toggleMenu() {
        if (menu.hidden) {
            openMenu();
            return;
        }

        closeMenu();
    }

    function handleDocumentPointerDown(event) {
        if (!wrapper.contains(event.target)) {
            closeMenu();
        }
    }

    function handleDocumentKeyDown(event) {
        if (event.key === 'Escape') {
            closeMenu({ restoreFocus: true });
            return;
        }

        if (event.key === 'Tab') {
            window.setTimeout(() => {
                if (!wrapper.contains(document.activeElement)) {
                    closeMenu();
                }
            }, 0);
        }
    }

    actionButton.addEventListener('click', () => {
        actions.handleExport();
    });
    toggleButton.addEventListener('click', () => {
        toggleMenu();
    });

    wrapper.append(actionButton, toggleButton, menu);

    return wrapper;
}

function createInspectorPanelTab({ state, actions }, panelKey, label) {
    const { activeInspectorPanel } = state.getCurrentSnapshot();
    const isSelected = activeInspectorPanel === panelKey;
    const button = createElement('button', {
        className: `inspector-panel-tab${isSelected ? ' selected' : ''}`,
        textContent: label,
        attributes: {
            type: 'button',
            role: 'tab',
            'aria-selected': isSelected ? 'true' : 'false',
        },
    });

    button.addEventListener('click', () => {
        if (state.getCurrentSnapshot().activeInspectorPanel === panelKey) {
            return;
        }

        state.setActiveInspectorPanel(panelKey);
        actions.renderInspector();
    });

    return button;
}

export function createInspectorActionArea({
    state,
    dom,
    actions,
    exportController,
    templatePackageActions = null,
}) {
    const actionArea = createElement('div', {
        className: 'inspector-action-area',
    });
    const primaryActions = createElement('div', {
        className: 'inspector-action-row',
        children: [
            createUploadButton({ dom }),
            createExportButton({ actions, exportController }),
        ],
    });
    const panelTabs = createElement('div', {
        className: 'inspector-panel-tabs',
        attributes: {
            role: 'tablist',
            'aria-label': '设置面板',
        },
        children: [
            createInspectorPanelTab({ state, actions }, 'basic', '基本'),
            createInspectorPanelTab({ state, actions }, 'text', '文本'),
            createInspectorPanelTab({ state, actions }, 'batch', '批量'),
        ],
    });

    actionArea.append(
        primaryActions,
        ...(templatePackageActions ? [templatePackageActions] : []),
        panelTabs
    );

    return actionArea;
}
