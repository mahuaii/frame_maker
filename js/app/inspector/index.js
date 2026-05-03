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
        }));

        if (activeInspectorPanel === 'batch') {
            dom.textEditor.appendChild(createBatchPhotoPanel({
                state,
                actions,
            }));
            return;
        }

        if (!template) return;

        if (activeInspectorPanel === 'text') {
            dom.textEditor.appendChild(createTextModelEditorPanel({
                template,
                state,
                dom,
                actions,
                textModelOperations,
            }));
            return;
        }

        appendBasicInspectorPanel(dom.textEditor, {
            template,
            state,
            actions,
        });
    }

    return {
        renderInspectorPanel,
    };
}
