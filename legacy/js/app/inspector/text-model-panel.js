import {
    createDefaultTextGroup,
    createDefaultTextItem,
} from '../../core/text/index.js';
import {
    RESET_ICON_PATHS,
    createElement,
    createIconButton,
} from '../../ui/controls.js';
import {
    findTextObjectById,
    getTextObjectDisplayLabel,
    getTextObjectTypeLabel,
} from '../text-model-operations.js';
import { createTextObjectFields } from './text-object-fields.js';

const EYE_ICON_PATHS = [
    'M1.5 8s2.25-4 6.5-4 6.5 4 6.5 4-2.25 4-6.5 4-6.5-4-6.5-4z',
    'M8 6.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z',
];
const EYE_OFF_ICON_PATHS = [
    ...EYE_ICON_PATHS,
    'M13.5 2.5l-11 11',
];
const TRASH_ICON_PATHS = [
    'M2.7 4h10.6',
    'M6.2 4V2.9h3.6V4',
    'M4 4l.5 9.1h7L12 4',
    'M6.8 6.4v4.4',
    'M9.2 6.4v4.4',
];

let pendingDeleteTextObjectId = null;
let draggingTextObjectId = null;

function clearPendingTextObjectDelete() {
    pendingDeleteTextObjectId = null;
}

function isTextObjectDescendantOf(item, objectId) {
    if (!item || item.id === objectId) {
        return Boolean(item);
    }

    if (item.type !== 'group' || !Array.isArray(item.items)) {
        return false;
    }

    return item.items.some((child) => isTextObjectDescendantOf(child, objectId));
}

function syncTextObjectTreeNode(context, itemId) {
    const { template, state, dom } = context;
    const textModel = state.getTemplateTextModel(template);
    const current = findTextObjectById(textModel, itemId);
    if (!current) {
        return;
    }

    const node = Array.from(dom.textEditor.querySelectorAll('.text-object-node'))
        .find((candidate) => candidate.dataset.textObjectId === String(itemId));
    if (!node) {
        return;
    }

    const label = node.querySelector(':scope > .text-object-row .text-object-label');

    if (label) {
        label.textContent = getTextObjectDisplayLabel(current.item, current.depth);
    }
}

function toggleTextObjectVisibility(context, itemId) {
    const { template, textModelOperations } = context;

    clearPendingTextObjectDelete();
    textModelOperations.commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        current.item.visible = current.item.visible === false;
    });
}

function getTextObjectVisibilityState(item, parentHidden = false) {
    const selfHidden = item.visible === false;

    return {
        selfHidden,
        hidden: parentHidden || selfHidden,
        label: selfHidden ? '显示' : '隐藏',
        iconPaths: selfHidden ? EYE_OFF_ICON_PATHS : EYE_ICON_PATHS,
    };
}

function deleteTextObject(context, itemId) {
    const { template, state, textModelOperations } = context;
    const { selectedTextObjectId } = state.getCurrentSnapshot();

    clearPendingTextObjectDelete();
    textModelOperations.commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        const shouldReplaceSelection = selectedTextObjectId === itemId
            || isTextObjectDescendantOf(current.item, selectedTextObjectId);

        textModelOperations.releaseTextModelObjectUrls([current.item]);
        current.siblings.splice(current.index, 1);

        if (shouldReplaceSelection) {
            state.setSelectedTextObjectId(current.siblings[Math.min(current.index, current.siblings.length - 1)]?.id
                ?? current.parent?.id
                ?? null);
        }
    });
}

function requestTextObjectDelete(context, itemId) {
    const { actions } = context;

    if (pendingDeleteTextObjectId === itemId) {
        deleteTextObject(context, itemId);
        return;
    }

    pendingDeleteTextObjectId = itemId;
    actions.renderInspector();
}

function clearDeleteStateOnPointerLeave(context, button, itemId) {
    const { actions } = context;
    const clearDeleteState = () => {
        if (pendingDeleteTextObjectId !== itemId) {
            return;
        }

        clearPendingTextObjectDelete();
        actions.renderInspector();
    };

    button.addEventListener('pointerleave', clearDeleteState);
    button.addEventListener('mouseleave', clearDeleteState);
}

function buildTextObjectNodeClassName({ selected, hidden, selfHidden }) {
    return [
        'text-object-node',
        selected ? 'selected' : '',
        hidden ? 'hidden' : '',
        selfHidden ? 'self-hidden' : '',
    ].filter(Boolean).join(' ');
}

function getTextObjectDropPosition(event, source, target) {
    const sourceIsRootGroup = source?.depth === 0 && source.item?.type === 'group';

    if (!sourceIsRootGroup && target.depth === 0 && target.item?.type === 'group') {
        return 'inside';
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    return event.clientY < midpoint ? 'before' : 'after';
}

function isValidTextObjectDrop(source, target, position) {
    if (!source || !target || source.item.id === target.item.id) {
        return false;
    }

    if (isTextObjectDescendantOf(source.item, target.item.id)) {
        return false;
    }

    const isRootGroup = source.depth === 0 && source.item.type === 'group';

    if (isRootGroup) {
        return target.depth === 0
            && target.item.type === 'group'
            && (position === 'before' || position === 'after');
    }

    if (position === 'inside') {
        return target.depth === 0 && target.item.type === 'group';
    }

    return target.depth === 1
        && target.parent?.type === 'group'
        && (position === 'before' || position === 'after');
}

function resolveTextObjectDrop(context, event, targetId) {
    const { template, state } = context;
    const sourceId = draggingTextObjectId || event.dataTransfer?.getData('text/plain');
    if (!sourceId) {
        return null;
    }

    const textModel = state.getTemplateTextModel(template);
    const source = findTextObjectById(textModel, sourceId);
    const target = findTextObjectById(textModel, targetId);
    const position = source && target ? getTextObjectDropPosition(event, source, target) : null;

    if (!isValidTextObjectDrop(source, target, position)) {
        return null;
    }

    return { sourceId, targetId, position };
}

function clearTextObjectDropIndicators(context) {
    context.dom.textEditor
        ?.querySelectorAll('.text-object-node.drag-over-before, .text-object-node.drag-over-after, .text-object-node.drag-over-inside')
        .forEach((node) => {
            node.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside');
        });
}

function clearTextObjectDragState(context) {
    clearTextObjectDropIndicators(context);
    context.dom.textEditor
        ?.querySelectorAll('.text-object-node.is-dragging')
        .forEach((node) => {
            node.classList.remove('is-dragging');
        });
}

function setTextObjectDropIndicator(context, targetId, position) {
    clearTextObjectDropIndicators(context);

    const node = Array.from(context.dom.textEditor.querySelectorAll('.text-object-node'))
        .find((candidate) => candidate.dataset.textObjectId === String(targetId));
    if (node) {
        node.classList.add(`drag-over-${position}`);
    }
}

function moveTextObject(model, sourceId, targetId, position) {
    const source = findTextObjectById(model, sourceId);
    const target = findTextObjectById(model, targetId);

    if (!isValidTextObjectDrop(source, target, position)) {
        return false;
    }

    const [movedItem] = source.siblings.splice(source.index, 1);
    const nextTarget = findTextObjectById(model, targetId);
    if (!nextTarget) {
        source.siblings.splice(source.index, 0, movedItem);
        return false;
    }

    if (position === 'inside') {
        nextTarget.item.items = Array.isArray(nextTarget.item.items) ? nextTarget.item.items : [];
        nextTarget.item.items.push(movedItem);
        return true;
    }

    const insertIndex = nextTarget.index + (position === 'after' ? 1 : 0);
    nextTarget.siblings.splice(insertIndex, 0, movedItem);
    return true;
}

function createTextObjectTreeNode(context, item, depth, parentHidden = false) {
    const { state, actions } = context;
    const { selectedTextObjectId } = state.getCurrentSnapshot();
    const isSelected = item.id === selectedTextObjectId;
    const visibility = getTextObjectVisibilityState(item, parentHidden);
    const node = createElement('div', {
        className: buildTextObjectNodeClassName({
            selected: isSelected,
            hidden: visibility.hidden,
            selfHidden: visibility.selfHidden,
        }),
        dataset: {
            textObjectId: item.id,
        },
        styleProperties: {
            '--text-object-depth': depth,
        },
    });
    const dragHandle = createElement('button', {
        className: 'text-object-drag-handle',
        attributes: {
            type: 'button',
            draggable: 'true',
            title: '拖拽排序',
            'aria-label': '拖拽排序',
        },
        children: [
            createElement('span'),
            createElement('span'),
            createElement('span'),
        ],
    });
    const selectButton = createElement('button', {
        className: 'text-object-select-button',
        attributes: {
            type: 'button',
        },
        children: [
            createElement('span', {
                className: 'text-object-type',
                textContent: getTextObjectTypeLabel(item),
            }),
            createElement('span', {
                className: 'text-object-label',
                textContent: getTextObjectDisplayLabel(item, depth),
            }),
        ],
    });
    const deleteButton = createIconButton({
        className: [
            'text-object-delete-button',
            pendingDeleteTextObjectId === item.id ? 'confirming' : '',
        ].filter(Boolean).join(' '),
        label: pendingDeleteTextObjectId === item.id ? '再次点击删除' : '删除',
        title: pendingDeleteTextObjectId === item.id ? '再次点击删除' : '删除',
        iconPaths: TRASH_ICON_PATHS,
        onClick: (event) => {
            event.stopPropagation();
            requestTextObjectDelete(context, item.id);
        },
    });
    clearDeleteStateOnPointerLeave(context, deleteButton, item.id);
    const visibilityButton = createIconButton({
        className: 'text-object-visibility-button',
        label: visibility.label,
        title: visibility.label,
        iconPaths: visibility.iconPaths,
        onClick: (event) => {
            event.stopPropagation();
            toggleTextObjectVisibility(context, item.id);
        },
    });
    const row = createElement('div', {
        className: 'text-object-row',
        children: [dragHandle, selectButton, deleteButton, visibilityButton],
    });

    dragHandle.addEventListener('dragstart', (event) => {
        clearPendingTextObjectDelete();
        draggingTextObjectId = item.id;
        node.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(item.id));
    });
    dragHandle.addEventListener('dragend', () => {
        draggingTextObjectId = null;
        clearTextObjectDragState(context);
    });
    row.addEventListener('dragover', (event) => {
        const drop = resolveTextObjectDrop(context, event, item.id);
        if (!drop) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setTextObjectDropIndicator(context, drop.targetId, drop.position);
    });
    row.addEventListener('dragleave', (event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
            return;
        }

        clearTextObjectDropIndicators(context);
    });
    row.addEventListener('drop', (event) => {
        const drop = resolveTextObjectDrop(context, event, item.id);
        if (!drop) {
            return;
        }

        event.preventDefault();
        clearPendingTextObjectDelete();
        draggingTextObjectId = null;
        clearTextObjectDragState(context);
        context.textModelOperations.commitTextModelChange(context.template, (model) => (
            moveTextObject(model, drop.sourceId, drop.targetId, drop.position)
        ));
    });

    selectButton.addEventListener('click', () => {
        clearPendingTextObjectDelete();
        state.setSelectedTextObjectId(item.id);
        actions.renderInspector();
    });
    node.appendChild(row);

    if (item.type === 'group' && Array.isArray(item.items) && item.items.length > 0) {
        item.items.forEach((child) => {
            node.appendChild(createTextObjectTreeNode(context, child, depth + 1, visibility.hidden));
        });
    }

    return node;
}

function createTextObjectTree(context) {
    const { template, state, textModelOperations } = context;
    const textModel = state.getTemplateTextModel(template);
    const header = createElement('div', {
        className: 'text-object-tree-header',
        children: [
            createElement('span', { textContent: '组 / 项' }),
            createElement('div', {
                className: 'text-object-tree-actions',
                children: [
                    createIconButton({
                        className: 'field-reset-button',
                        label: '重置文本',
                        iconPaths: RESET_ICON_PATHS,
                        onClick: () => {
                            clearPendingTextObjectDelete();
                            textModelOperations.resetCurrentTemplateTextModel();
                        },
                    }),
                    createElement('button', {
                        className: 'btn-small text-object-add-button',
                        textContent: '新增文本组',
                        attributes: { type: 'button' },
                    }),
                ],
            }),
        ],
    });
    const addButton = header.querySelector('.text-object-add-button');
    addButton.addEventListener('click', () => {
        clearPendingTextObjectDelete();
        textModelOperations.commitTextModelChange(template, (model) => {
            const group = createDefaultTextGroup();
            model.push(group);
            state.setSelectedTextObjectId(group.id);
        });
    });

    const list = createElement('div', {
        className: 'text-object-tree-list',
    });
    list.addEventListener('dragover', (event) => {
        if (!draggingTextObjectId) {
            return;
        }

        event.preventDefault();
    });
    list.addEventListener('dragleave', (event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
            return;
        }

        clearTextObjectDropIndicators(context);
    });

    if (textModel.length === 0) {
        list.appendChild(createElement('div', {
            className: 'text-object-empty',
            textContent: '暂无文本组',
        }));
    } else {
        textModel.forEach((group) => {
            list.appendChild(createTextObjectTreeNode(context, group, 0));
        });
    }

    const { selectedTextObjectId } = state.getCurrentSnapshot();
    const selected = selectedTextObjectId ? findTextObjectById(textModel, selectedTextObjectId) : null;
    const actionBar = createTextObjectActionBar(context, selected);

    return createElement('div', {
        className: 'text-object-tree inspector-content-contained',
        children: [header, list, actionBar],
    });
}

function createTextObjectActionBar(context, selected) {
    const { template, state, textModelOperations } = context;
    if (!selected || selected.item.type !== 'group') {
        return null;
    }

    const { item, depth } = selected;
    const itemId = item.id;
    const actions = createElement('div', {
        className: 'text-object-action-bar',
    });

    [
        ['text', '文字'],
        ['separator', '分隔线'],
        ['image', '图片'],
        ...(depth === 0 ? [['group', '子组']] : []),
    ].forEach(([type, label]) => {
        const button = createElement('button', {
            className: 'btn-small text-object-action',
            textContent: `+${label}`,
            attributes: { type: 'button' },
        });
        button.addEventListener('click', () => {
            textModelOperations.commitTextModelChange(template, (model) => {
                const current = findTextObjectById(model, itemId);
                if (!current || current.item.type !== 'group') {
                    return false;
                }

                clearPendingTextObjectDelete();
                const nextItem = createDefaultTextItem(type);
                current.item.items = Array.isArray(current.item.items) ? current.item.items : [];
                current.item.items.push(nextItem);
                state.setSelectedTextObjectId(nextItem.id);
            });
        });
        actions.appendChild(button);
    });

    return actions;
}

function createSelectedTextObjectPanel(context) {
    const { template, state, textModelOperations } = context;
    const selectedId = textModelOperations.ensureSelectedTextObject(template);
    const textModel = state.getTemplateTextModel(template);
    const selected = selectedId ? findTextObjectById(textModel, selectedId) : null;

    if (!selected) {
        return createElement('div', {
            className: 'text-object-properties text-object-empty inspector-content-contained',
            textContent: '选择或新增文本组',
        });
    }

    return createElement('div', {
        className: 'text-object-properties',
        children: [
            createTextObjectFields({
                ...context,
                onTreeNodeChanged: (itemId) => syncTextObjectTreeNode(context, itemId),
            }, selected),
        ],
    });
}

export function createTextModelEditorPanel(context) {
    const { template, textModelOperations } = context;
    textModelOperations.ensureSelectedTextObject(template);

    return createElement('div', {
        className: 'text-model-editor',
        children: [
            createTextObjectTree(context),
            createSelectedTextObjectPanel(context),
        ],
    });
}
