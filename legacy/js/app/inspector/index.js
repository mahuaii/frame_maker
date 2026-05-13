import { createInspectorActionArea } from './action-area.js';
import { appendBasicInspectorPanel } from './basic-panel.js';
import { createBatchPhotoPanel } from './batch-panel.js';
import { createTextModelEditorPanel } from './text-model-panel.js';

export function createInspectorController({
    dom,
    state,
    actions,
    getTemplateById,
    exportController,
    textModelOperations,
    createTemplatePackageActions,
}) {
    function renderInspectorPanel() {
        const {
            activeInspectorPanel,
            selectedTemplateId,
        } = state.getCurrentSnapshot();
        const template = getTemplateById(selectedTemplateId);

        exportController.closeExportMenu();
        dom.textEditor.innerHTML = '';
        dom.textEditor.appendChild(createInspectorActionArea({
            state,
            dom,
            actions,
            exportController,
            templatePackageActions: typeof createTemplatePackageActions === 'function'
                ? createTemplatePackageActions()
                : null,
        }));
        const scrollArea = document.createElement('div');
        scrollArea.className = 'inspector-scroll-area';
        dom.textEditor.appendChild(scrollArea);

        if (activeInspectorPanel === 'batch') {
            scrollArea.appendChild(createBatchPhotoPanel({
                state,
                actions,
            }));
            return;
        }

        if (!template) return;

        if (activeInspectorPanel === 'text') {
            scrollArea.appendChild(createTextModelEditorPanel({
                template,
                state,
                dom,
                actions,
                textModelOperations,
            }));
            return;
        }

        appendBasicInspectorPanel(scrollArea, {
            template,
            state,
            actions,
        });
    }

    return {
        renderInspectorPanel,
    };
}
