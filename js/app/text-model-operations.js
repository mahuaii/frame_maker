import { cloneTextModel } from '../core/text/index.js';

export function getTextObjectTypeLabel(item) {
    const labels = {
        group: '组',
        text: '文',
        separator: '线',
        image: '图',
    };

    return labels[item?.type] ?? '?';
}

export function summarizeTextObjectContent(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

export function getFirstTextObjectContent(item) {
    if (!item) {
        return '';
    }

    if (item.type === 'text') {
        return summarizeTextObjectContent(item.content);
    }

    if (item.type === 'group' && Array.isArray(item.items)) {
        for (const child of item.items) {
            const content = getFirstTextObjectContent(child);
            if (content) {
                return content;
            }
        }
    }

    return '';
}

export function getTextObjectDisplayLabel(item, depth = 0) {
    if (item?.type === 'text') {
        return getFirstTextObjectContent(item) || '文字';
    }

    if (item?.type === 'group') {
        return summarizeTextObjectContent(item.label) || (depth > 0 ? '子组' : '文本组');
    }

    if (item?.type === 'separator') {
        return '分隔线';
    }

    if (item?.type === 'image') {
        return summarizeTextObjectContent(item.source?.name) || '图片';
    }

    return getTextObjectTypeLabel(item);
}

export function findTextObjectById(items = [], objectId, parent = null, depth = 0) {
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.id === objectId) {
            return { item, parent, index, depth, siblings: items };
        }

        if (item.type === 'group') {
            const found = findTextObjectById(item.items ?? [], objectId, item, depth + 1);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

export function createTextModelOperations({ state, actions, getTemplateById }) {
    function releaseTextModelObjectUrls(textModel = []) {
        const visit = (items = []) => {
            items.forEach((item) => {
                if (item.type === 'image' && item.source?.type === 'objectUrl' && item.source.src) {
                    state.releaseObjectUrl(item.source.src);
                }

                if (item.type === 'group') {
                    visit(item.items);
                }
            });
        };

        visit(textModel);
    }

    function ensureSelectedTextObject(template) {
        const { selectedTextObjectId } = state.getCurrentSnapshot();
        const textModel = state.getTemplateTextModel(template);
        if (selectedTextObjectId && findTextObjectById(textModel, selectedTextObjectId)) {
            return selectedTextObjectId;
        }

        const nextSelectedId = textModel[0]?.id ?? null;
        state.setSelectedTextObjectId(nextSelectedId);
        return nextSelectedId;
    }

    function commitTextModelChange(template, mutate, {
        renderEditor = true,
    } = {}) {
        const textModel = state.getTemplateTextModel(template);
        const result = mutate(textModel);
        if (result === false) {
            return false;
        }

        state.setTemplateTextModel(template, textModel);
        ensureSelectedTextObject(template);
        state.saveActivePhotoState();
        if (renderEditor) {
            actions.renderInspector();
        }
        actions.updatePreview();

        return true;
    }

    function resetCurrentTemplateTextModel() {
        const { selectedTemplateId } = state.getCurrentSnapshot();
        const template = getTemplateById(selectedTemplateId);
        if (!template) return;

        releaseTextModelObjectUrls(state.getTemplateTextModel(template));
        state.setTemplateTextModel(template, cloneTextModel(template.textGroups ?? []));
        state.setSelectedTextObjectId(state.getTemplateTextModel(template)[0]?.id ?? null);
        state.saveActivePhotoState();
        actions.renderInspector();
        actions.updatePreview();
    }

    return {
        releaseTextModelObjectUrls,
        ensureSelectedTextObject,
        commitTextModelChange,
        resetCurrentTemplateTextModel,
    };
}
