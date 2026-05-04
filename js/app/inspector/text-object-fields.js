import { getPathValue, setPathValue } from '../../core/utils/object-path.js';
import { buildColorTokenField, resolveTemplateAppearance } from '../../core/templates/registry.js';
import {
    getFontFieldOptions,
    getFontWeightOptions,
    normalizeFontWeightForFont,
} from '../../core/fonts/index.js';
import { createElement, createFieldGroup } from '../../ui/controls.js';
import { createInspectorFieldList } from '../../ui/inspector.js';
import { findTextObjectById } from '../text-model-operations.js';

const TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS = new Set(['label', 'style.fontId', 'style.fontStyle']);
const DEFAULT_TEXT_OBJECT_FONT_ID = 'systemSans';
const DEFAULT_TEXT_OBJECT_FONT_WEIGHT = 400;
const OWN_FONT_STYLE_KEYS = [
    'style.fontId',
    'style.fontIdEn',
    'style.fontIdZh',
    'style.fontWeight',
    'style.fontStyle',
];

function getTextObjectFontId(item) {
    return getPathValue(item, 'style.fontId') ?? DEFAULT_TEXT_OBJECT_FONT_ID;
}

function getTextObjectUsesOwnFont(item) {
    const explicitValue = getPathValue(item, 'style.useOwnFont');
    if (typeof explicitValue === 'boolean') {
        return explicitValue;
    }

    return OWN_FONT_STYLE_KEYS.some((key) => getPathValue(item, key) !== undefined);
}

function getTextObjectFontWeight(item, fontId = getTextObjectFontId(item)) {
    return normalizeFontWeightForFont(
        getPathValue(item, 'style.fontWeight') ?? DEFAULT_TEXT_OBJECT_FONT_WEIGHT,
        fontId
    );
}

function applyTextEditorFieldFrameStyle(fields = []) {
    return fields.map((field) => {
        if (!field || TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS.has(field.key)) {
            return field;
        }

        const classNames = new Set(String(field.groupClassName ?? '').split(/\s+/).filter(Boolean));
        classNames.add('field-frame-gray');

        return {
            ...field,
            groupClassName: Array.from(classNames).join(' '),
        };
    });
}

function buildTextObjectStyleFields(template, activeAppearanceKey, fontFields, {
    includeFontFields = true,
} = {}) {
    return [
        ...(includeFontFields ? fontFields : []),
        { key: 'style.fontScale', label: '字号倍率', type: 'number', min: 0.1, step: 0.05, defaultValue: 1 },
        buildColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
            key: 'style.colorToken',
            label: '颜色',
            defaultValue: 'textPrimary',
        }),
        { key: 'style.color', label: '自定义颜色', type: 'color', defaultValue: '#111111' },
        { key: 'style.letterSpacingScale', label: '字距', type: 'number', step: 0.01, defaultValue: 0 },
    ];
}

function buildTextObjectFieldDefinitions(item, depth, template, state) {
    const { fieldValues } = state.getCurrentSnapshot();
    const activeAppearanceKey = resolveTemplateAppearance(template, fieldValues).key;
    const fontId = getTextObjectFontId(item);
    const usesOwnFont = getTextObjectUsesOwnFont(item);
    const fontFields = [
        {
            key: 'style.fontId',
            label: '字体',
            type: 'select',
            defaultValue: DEFAULT_TEXT_OBJECT_FONT_ID,
            options: getFontFieldOptions(),
        },
        {
            key: 'style.fontStyle',
            label: '字体样式',
            type: 'select',
            defaultValue: 'normal',
            options: [
                { value: 'normal', label: '常规' },
                { value: 'italic', label: '斜体' },
            ],
        },
        {
            key: 'style.fontWeight',
            label: '字重',
            type: 'select',
            defaultValue: getTextObjectFontWeight(item, fontId),
            options: getFontWeightOptions(fontId),
        },
    ];
    const styleFields = buildTextObjectStyleFields(template, activeAppearanceKey, fontFields);

    if (item.type === 'group') {
        return applyTextEditorFieldFrameStyle([
            { key: 'label', label: '组标题', type: 'input', defaultValue: depth > 0 ? '子组' : '文本组' },
            ...(depth === 0 ? [
                {
                    key: 'region',
                    label: '位置边区',
                    type: 'select',
                    defaultValue: 'bottom',
                    options: [
                        { value: 'top', label: '上' },
                        { value: 'right', label: '右' },
                        { value: 'bottom', label: '下' },
                        { value: 'left', label: '左' },
                    ],
                },
                {
                    key: 'anchor',
                    label: '锚点',
                    type: 'select',
                    control: 'nine-grid',
                    defaultValue: 'center',
                    options: [
                        { value: 'top-left', label: '左上' },
                        { value: 'top-center', label: '上中' },
                        { value: 'top-right', label: '右上' },
                        { value: 'middle-left', label: '左中' },
                        { value: 'center', label: '中心' },
                        { value: 'middle-right', label: '右中' },
                        { value: 'bottom-left', label: '左下' },
                        { value: 'bottom-center', label: '下中' },
                        { value: 'bottom-right', label: '右下' },
                    ],
                },
            ] : []),
            {
                key: 'align',
                label: '对齐方式',
                type: 'select',
                defaultValue: 'center',
                options: [
                    { value: 'start', label: '起始' },
                    { value: 'center', label: '居中' },
                    { value: 'end', label: '结束' },
                ],
            },
            {
                key: 'direction',
                label: '排列方向',
                type: 'select',
                defaultValue: 'vertical',
                options: [
                    { value: 'vertical', label: '垂直' },
                    { value: 'horizontal', label: '水平' },
                ],
            },
            { key: 'gapScale', label: '组内间距', type: 'number', step: 0.05, defaultValue: 0.4 },
            ...(depth === 0 ? [
                { key: 'offsetXScale', label: 'X 偏移', type: 'number', step: 0.1, defaultValue: 0 },
                { key: 'offsetYScale', label: 'Y 偏移', type: 'number', step: 0.1, defaultValue: 0 },
            ] : []),
            ...styleFields,
        ]);
    }

    if (item.type === 'text') {
        return applyTextEditorFieldFrameStyle([
            { key: 'content', label: '内容', type: 'textarea', defaultValue: '' },
            { key: 'style.useOwnFont', label: '独立字体', type: 'toggle', defaultValue: usesOwnFont },
            ...buildTextObjectStyleFields(template, activeAppearanceKey, fontFields, {
                includeFontFields: usesOwnFont,
            }),
        ]);
    }

    if (item.type === 'separator') {
        return applyTextEditorFieldFrameStyle([
            { key: 'forceVisible', label: '强制显示', type: 'toggle', defaultValue: false },
            { key: 'lengthScale', label: '长度', type: 'number', min: 0.1, step: 0.05, defaultValue: 1.4 },
            { key: 'thicknessScale', label: '粗细', type: 'number', min: 0.01, step: 0.01, defaultValue: 0.06 },
            buildColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
                key: 'colorToken',
                label: '颜色',
                defaultValue: 'separator',
            }),
            { key: 'color', label: '自定义颜色', type: 'color', defaultValue: '#9CA3AF' },
        ]);
    }

    return [];
}

function buildTextObjectFieldValues(item, fields) {
    return fields.reduce((values, field) => {
        if (field.key === 'style.useOwnFont') {
            values[field.key] = getTextObjectUsesOwnFont(item);
            return values;
        }

        if (field.key === 'style.fontWeight') {
            values[field.key] = getTextObjectFontWeight(item);
            return values;
        }

        values[field.key] = getPathValue(item, field.key) ?? field.defaultValue ?? '';
        return values;
    }, {});
}

function getFieldByKey(fields, fieldKey) {
    return fields.find((field) => field.key === fieldKey);
}

function createTextObjectFieldGrid(fields, fieldOptions) {
    const fieldGroups = fields
        .filter(Boolean)
        .map((field) => createFieldGroup(field, fieldOptions));

    return createElement('div', {
        className: 'inspector-field-grid inspector-field-grid-contained',
        children: fieldGroups,
    });
}

function createTextObjectOffsetFieldGrid(fields, fieldOptions) {
    const prefixLabels = {
        offsetXScale: 'X',
        offsetYScale: 'Y',
    };
    const fieldGroups = fields
        .filter(Boolean)
        .map((field) => createFieldGroup(field, {
            ...fieldOptions,
            compact: true,
            label: prefixLabels[field.key] ?? field.label,
        }));
    const grid = createElement('div', {
        className: 'inspector-field-grid text-object-offset-grid',
        children: fieldGroups,
    });

    return createElement('div', {
        className: 'text-object-offset-fields inspector-field-grid-contained',
        children: [
            createElement('div', {
                className: 'field-group-label',
                textContent: '偏移',
            }),
            grid,
        ],
    });
}

function createTextGroupAnchorLayout(fields, fieldOptions) {
    const anchorField = fields.find((field) => field.key === 'anchor');
    const sideFields = ['region', 'align']
        .map((fieldKey) => fields.find((field) => field.key === fieldKey))
        .filter(Boolean);
    const fieldGroups = [anchorField, ...sideFields]
        .filter(Boolean)
        .map((field) => createFieldGroup(field, fieldOptions));

    return createElement('div', {
        className: 'text-group-anchor-layout inspector-field-grid-contained',
        children: fieldGroups,
    });
}

function createTextObjectStructuredFieldList(fields, fieldOptions, {
    rootGroup = false,
} = {}) {
    const anchorLayoutFieldKeys = new Set(['region', 'anchor', 'align']);
    const pairedFieldKeyGroups = [
        ['direction', 'gapScale'],
        ['offsetXScale', 'offsetYScale'],
        ['style.fontScale', 'style.fontWeight'],
    ];
    const pairedFieldKeys = new Set(pairedFieldKeyGroups.flat());
    const content = createElement('div', {
        className: 'editor-collapsible-content',
    });

    fields.forEach((field) => {
        if (rootGroup && field.key === 'region') {
            content.appendChild(createTextGroupAnchorLayout(fields, fieldOptions));
            return;
        }

        if (rootGroup && anchorLayoutFieldKeys.has(field.key)) {
            return;
        }

        const pairKeys = pairedFieldKeyGroups.find(([firstKey]) => firstKey === field.key);
        if (pairKeys) {
            const pairFields = pairKeys
                .map((fieldKey) => getFieldByKey(fields, fieldKey))
                .filter(Boolean);

            if (pairFields.length > 0) {
                content.appendChild(pairKeys[0] === 'offsetXScale'
                    ? createTextObjectOffsetFieldGrid(pairFields, fieldOptions)
                    : createTextObjectFieldGrid(pairFields, fieldOptions));
            }
            return;
        }

        if (pairedFieldKeys.has(field.key)) {
            return;
        }

        content.appendChild(createFieldGroup(field, fieldOptions));
    });

    return content;
}

function commitTextObjectFieldValue({ template, state, textModelOperations, onTreeNodeChanged }, item, fieldKey, nextValue) {
    const itemId = item.id;
    const committed = textModelOperations.commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        const committedValue = fieldKey === 'style.fontWeight'
            ? getTextObjectFontWeight({
                style: {
                    fontId: getTextObjectFontId(current.item),
                    fontWeight: nextValue,
                },
            })
            : nextValue;

        setPathValue(current.item, fieldKey, committedValue);

        if (fieldKey === 'style.useOwnFont' && committedValue) {
            if (getPathValue(current.item, 'style.fontId') === undefined) {
                setPathValue(current.item, 'style.fontId', DEFAULT_TEXT_OBJECT_FONT_ID);
            }
            if (getPathValue(current.item, 'style.fontStyle') === undefined) {
                setPathValue(current.item, 'style.fontStyle', 'normal');
            }
            if (getPathValue(current.item, 'style.fontWeight') === undefined) {
                setPathValue(current.item, 'style.fontWeight', DEFAULT_TEXT_OBJECT_FONT_WEIGHT);
            }
        }
    }, {
        renderEditor: fieldKey === 'style.useOwnFont',
    });

    if (committed) {
        onTreeNodeChanged?.(itemId);
    }
}

function commitTextObjectFontId(context, item, nextFontId) {
    const { template, state, textModelOperations, onTreeNodeChanged } = context;
    const itemId = item.id;
    const committed = textModelOperations.commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        const nextFontWeight = normalizeFontWeightForFont(
            getPathValue(current.item, 'style.fontWeight') ?? DEFAULT_TEXT_OBJECT_FONT_WEIGHT,
            nextFontId
        );

        setPathValue(current.item, 'style.fontId', nextFontId);
        setPathValue(current.item, 'style.fontWeight', nextFontWeight);
    });

    if (committed) {
        onTreeNodeChanged?.(itemId);
    }
}

function createImageSourceControl(context, item) {
    const { template, state, textModelOperations } = context;
    const itemId = item.id;
    const wrapper = createElement('div', {
        className: 'image-source-control inspector-content-contained',
    });
    const label = createElement('div', {
        className: 'field-group-label',
        textContent: item.source?.name || '未选择图片',
    });
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    const chooseButton = createElement('button', {
        className: 'btn btn-secondary',
        textContent: item.source ? '替换图片' : '选择图片',
        attributes: { type: 'button' },
    });
    const clearButton = createElement('button', {
        className: 'btn',
        textContent: '清除图片',
        attributes: {
            type: 'button',
            disabled: !item.source,
        },
    });

    chooseButton.addEventListener('click', () => {
        input.click();
    });
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        state.registerObjectUrl(objectUrl);
        const committed = textModelOperations.commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            textModelOperations.releaseTextModelObjectUrls([current.item]);
            current.item.source = {
                type: 'objectUrl',
                src: objectUrl,
                name: file.name,
            };
        });
        if (!committed) {
            state.releaseObjectUrl(objectUrl);
        }
    });
    clearButton.addEventListener('click', () => {
        textModelOperations.commitTextModelChange(template, (model) => {
            const current = findTextObjectById(model, itemId);
            if (!current) {
                return false;
            }

            textModelOperations.releaseTextModelObjectUrls([current.item]);
            current.item.source = null;
        });
    });

    wrapper.append(label, input, chooseButton, clearButton);
    return wrapper;
}

export function createTextObjectFields(context, selected) {
    const { template, state } = context;
    const { item, depth } = selected;
    const fields = buildTextObjectFieldDefinitions(item, depth, template, state);
    const values = buildTextObjectFieldValues(item, fields);
    const fieldOptions = {
        values,
        idPrefix: `text-object-${item.id}`,
        onChange: (field, nextValue) => {
            if (field.key === 'style.fontId') {
                commitTextObjectFontId(context, item, nextValue);
                return;
            }

            commitTextObjectFieldValue(context, item, field.key, nextValue);
        },
    };
    const list = item.type === 'group' || item.type === 'text'
        ? createTextObjectStructuredFieldList(fields, fieldOptions, {
            rootGroup: item.type === 'group' && depth === 0,
        })
        : createInspectorFieldList(fields, fieldOptions);

    if (item.type === 'image') {
        list.appendChild(createImageSourceControl(context, item));
    }

    return list;
}
