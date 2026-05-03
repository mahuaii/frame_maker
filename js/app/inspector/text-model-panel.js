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

    const label = node.querySelector(':scope > .text-object-row > .text-object-label');
    const status = node.querySelector(':scope > .text-object-row > .text-object-status');

    if (label) {
        label.textContent = getTextObjectDisplayLabel(current.item, current.depth);
    }

    if (status) {
        status.textContent = current.item.visible === false ? '隐藏' : '';
    }
}

function createTextObjectTreeNode(context, item, depth) {
    const { state, actions } = context;
    const { selectedTextObjectId } = state.getCurrentSnapshot();
    const isSelected = item.id === selectedTextObjectId;
    const node = createElement('div', {
        className: `text-object-node${isSelected ? ' selected' : ''}`,
        dataset: {
            textObjectId: item.id,
        },
        styleProperties: {
            '--text-object-depth': depth,
        },
    });
    const row = createElement('button', {
        className: 'text-object-row',
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
            createElement('span', {
                className: 'text-object-status',
                textContent: item.visible === false ? '隐藏' : '',
            }),
        ],
    });

    row.addEventListener('click', () => {
        state.setSelectedTextObjectId(item.id);
        actions.renderInspector();
    });
    node.appendChild(row);

    if (item.type === 'group' && Array.isArray(item.items) && item.items.length > 0) {
        item.items.forEach((child) => {
            node.appendChild(createTextObjectTreeNode(context, child, depth + 1));
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
                        onClick: textModelOperations.resetCurrentTemplateTextModel,
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
        textModelOperations.commitTextModelChange(template, (model) => {
            const group = createDefaultTextGroup();
            model.push(group);
            state.setSelectedTextObjectId(group.id);
        });
    });

    const list = createElement('div', {
        className: 'text-object-tree-list',
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

    return createElement('div', {
        className: 'text-object-tree inspector-content-contained',
        children: [header, list],
    });
}

function createTextObjectActionBar(context, selected) {
    const { template, state, textModelOperations } = context;
    const { item, siblings, index, depth } = selected;
    const itemId = item.id;
    const actions = createElement('div', {
        className: 'text-object-action-bar inspector-content-contained',
    });

    if (item.type === 'group') {
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

                    const nextItem = createDefaultTextItem(type);
                    current.item.items = Array.isArray(current.item.items) ? current.item.items : [];
                    current.item.items.push(nextItem);
                    state.setSelectedTextObjectId(nextItem.id);
                });
            });
            actions.appendChild(button);
        });
    }

    [
        ['上移', -1],
        ['下移', 1],
    ].forEach(([label, direction]) => {
        const button = createElement('button', {
            className: 'btn-small text-object-action',
            textContent: label,
            attributes: {
                type: 'button',
                disabled: direction < 0 ? index <= 0 : index >= siblings.length - 1,
            },
        });
        button.addEventListener('click', () => {
            textModelOperations.commitTextModelChange(template, (model) => {
                const current = findTextObjectById(model, itemId);
                if (!current) {
                    return false;
                }

                const nextIndex = current.index + direction;
                if (nextIndex < 0 || nextIndex >= current.siblings.length) {
                    return false;
                }

                const [movedItem] = current.siblings.splice(current.index, 1);
                current.siblings.splice(nextIndex, 0, movedItem);
            });
        });
        actions.appendChild(button);
    });

    const deleteButton = createElement('button', {
        className: 'btn-small text-object-action danger',
        textContent: '删除',
        attributes: {
            type: 'button',
        },
    });
    deleteButton.addEventListener('click', () => {
        textModelOperations.commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            textModelOperations.releaseTextModelObjectUrls([current.item]);
            current.siblings.splice(current.index, 1);
            state.setSelectedTextObjectId(current.siblings[Math.min(current.index, current.siblings.length - 1)]?.id
                ?? current.parent?.id
                ?? null);
        });
    });
    actions.appendChild(deleteButton);

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
            createTextObjectActionBar(context, selected),
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
