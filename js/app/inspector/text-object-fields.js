import { getPathValue, setPathValue } from '../../core/utils/object-path.js';
import { buildColorTokenField, resolveTemplateAppearance } from '../../core/templates/registry.js';
import {
    getFontFieldOptions,
    getFontWeightOptions,
    normalizeFontWeightForFont,
} from '../../core/fonts/index.js';
import { createElement, createFieldGroup, createIconButton } from '../../ui/controls.js';
import { createInspectorFieldList } from '../../ui/inspector.js';
import { findTextObjectById } from '../text-model-operations.js';

const TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS = new Set(['label', 'style.fontId', 'style.fontStyle']);
const TEXT_EDITOR_WHITE_FIELD_KEYS = new Set(['rotation', 'align', 'direction', 'style.fontWeight']);
const TEXT_COLOR_FIELD_KEYS = new Set(['style.colorToken', 'style.color', 'colorToken', 'color']);
const DEFAULT_TEXT_OBJECT_FONT_ID = 'systemSans';
const DEFAULT_TEXT_OBJECT_FONT_WEIGHT = 400;
const PLUS_ICON_PATHS = ['M8 3v10', 'M3 8h10'];
const MINUS_ICON_PATHS = ['M3 8h10'];
const OWN_FONT_STYLE_KEYS = [
    'style.fontId',
    'style.fontIdEn',
    'style.fontIdZh',
    'style.fontWeight',
    'style.fontStyle',
];

function clampNumber(value, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return min;
    }

    return Math.min(Math.max(numericValue, min), max);
}

function toHexChannel(value) {
    return Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
}

function alphaHexToPercent(alphaHex) {
    const numericValue = Number.parseInt(alphaHex, 16);
    if (!Number.isFinite(numericValue)) {
        return 100;
    }

    return Math.round((numericValue / 255) * 100);
}

function alphaPercentToHex(alphaPercent) {
    return toHexChannel((clampNumber(alphaPercent, 0, 100) / 100) * 255);
}

function parseCssAlpha(value) {
    if (typeof value !== 'string') {
        return 100;
    }

    const trimmedValue = value.trim();
    if (trimmedValue.endsWith('%')) {
        return clampNumber(Number.parseFloat(trimmedValue), 0, 100);
    }

    return clampNumber(Number.parseFloat(trimmedValue) * 100, 0, 100);
}

function normalizeHexDraft(value, fallbackHex = '000000') {
    if (typeof value !== 'string') {
        return fallbackHex;
    }

    const compactValue = value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (compactValue.length === 3) {
        return compactValue.split('').map((character) => character + character).join('');
    }

    if (compactValue.length >= 6) {
        return compactValue.slice(0, 6);
    }

    return fallbackHex;
}

function sanitizeHexDraft(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

function parseColorValue(value, fallbackValue = '#000000FF') {
    if (typeof value !== 'string') {
        return parseColorValue(fallbackValue);
    }

    const trimmedValue = value.trim();
    const hexMatch = trimmedValue.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const rawHex = hexMatch[1].toUpperCase();
        const expandedHex = rawHex.length === 3
            ? rawHex.split('').map((character) => character + character).join('')
            : rawHex;

        return {
            hex: expandedHex.slice(0, 6),
            alpha: expandedHex.length === 8 ? alphaHexToPercent(expandedHex.slice(6, 8)) : 100,
        };
    }

    const rgbMatch = trimmedValue.match(/^rgba?\((.+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map((part) => part.trim());
        const [red, green, blue] = parts;

        if (red !== undefined && green !== undefined && blue !== undefined) {
            return {
                hex: [
                    toHexChannel(Number.parseFloat(red)),
                    toHexChannel(Number.parseFloat(green)),
                    toHexChannel(Number.parseFloat(blue)),
                ].join(''),
                alpha: parts[3] !== undefined ? parseCssAlpha(parts[3]) : 100,
            };
        }
    }

    return fallbackValue !== value ? parseColorValue(fallbackValue) : { hex: '000000', alpha: 100 };
}

function normalizeColorValue(value, fallbackValue = '#000000FF') {
    const parsedColor = parseColorValue(value, fallbackValue);

    return `#${parsedColor.hex}${alphaPercentToHex(parsedColor.alpha)}`;
}

function formatColorHex(value) {
    return parseColorValue(value).hex;
}

function formatColorAlpha(value) {
    return String(parseColorValue(value).alpha);
}

function getColorOptionValue(option) {
    return normalizeColorValue(option?.swatch ?? '#000000EE');
}

function isTextColorField(field) {
    return TEXT_COLOR_FIELD_KEYS.has(field?.key);
}

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
        if (TEXT_EDITOR_WHITE_FIELD_KEYS.has(field.key)) {
            classNames.delete('field-frame-gray');
            classNames.add('field-frame-white');

            return {
                ...field,
                groupClassName: Array.from(classNames).join(' '),
            };
        }

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
            group: 'text',
        }),
        { key: 'style.color', label: '自定义颜色', type: 'color', defaultValue: '#000000EE' },
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
                    control: 'frame-region',
                    defaultValue: 'bottom',
                    options: [
                        { value: 'top', label: '上' },
                        { value: 'right', label: '右' },
                        { value: 'bottom', label: '下' },
                        { value: 'left', label: '左' },
                        { value: 'center', label: '中间' },
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
                key: 'rotation',
                label: '文字方向',
                type: 'select',
                defaultValue: 0,
                options: [
                    { value: 0, label: '正常' },
                    { value: 90, label: '顺时针 90°' },
                    { value: 180, label: '倒置 180°' },
                    { value: 270, label: '逆时针 90°' },
                ],
            },
            {
                key: 'align',
                label: '对齐方式',
                type: 'select',
                control: 'text-align-radio',
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
                group: 'text',
            }),
            { key: 'color', label: '自定义颜色', type: 'color', defaultValue: '#0000005A' },
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
    const regionField = fields.find((field) => field.key === 'region');
    const fieldGroups = [regionField, anchorField]
        .filter(Boolean);

    return createElement('div', {
        className: 'text-group-anchor-layout inspector-field-grid-contained',
        children: fieldGroups.map((field) => createFieldGroup(field, fieldOptions)),
    });
}

function getTextColorFields(fields) {
    const tokenField = fields.find((field) => field.key === 'style.colorToken')
        ?? fields.find((field) => field.key === 'colorToken');
    const colorField = fields.find((field) => field.key === 'style.color')
        ?? fields.find((field) => field.key === 'color');

    return tokenField && colorField ? { tokenField, colorField } : null;
}

function getTextColorTokenValue(item, tokenField) {
    return getPathValue(item, tokenField.key) ?? tokenField.defaultValue ?? tokenField.options?.[0]?.value ?? '';
}

function getTextColorCustomValue(item, colorField) {
    return normalizeColorValue(getPathValue(item, colorField.key) ?? colorField.defaultValue ?? '#000000FF');
}

function getTextColorDefaultOption(tokenField) {
    const defaultValue = tokenField.defaultValue ?? tokenField.options?.[0]?.value ?? '';

    return tokenField.options?.find((option) => option.value === defaultValue)
        ?? tokenField.options?.[0]
        ?? null;
}

function getTextObjectEffectiveColor(item, tokenField, colorField) {
    const tokenValue = getTextColorTokenValue(item, tokenField);
    const tokenOption = tokenField.options?.find((option) => option.value === tokenValue);

    return tokenOption ? getColorOptionValue(tokenOption) : getTextColorCustomValue(item, colorField);
}

function commitTextObjectColorValue(context, item, tokenField, colorField, {
    token,
    color,
    renderEditor = true,
}) {
    const { template, textModelOperations } = context;
    const itemId = item.id;

    textModelOperations.commitTextModelChange(template, (model) => {
        const current = findTextObjectById(model, itemId);
        if (!current) {
            return false;
        }

        setPathValue(current.item, tokenField.key, token ?? '');
        setPathValue(current.item, colorField.key, normalizeColorValue(color, colorField.defaultValue ?? '#000000FF'));
    }, {
        renderEditor,
    });
}

function createTextColorValueDisplay(value) {
    return [
        createElement('span', {
            className: 'text-color-value',
            textContent: formatColorHex(value),
        }),
        createElement('span', {
            className: 'text-color-opacity',
            textContent: formatColorAlpha(value),
        }),
        createElement('span', {
            className: 'text-color-unit',
            textContent: '%',
        }),
    ];
}

function createTextColorValueInputs(context, item, tokenField, colorField, paletteItem, value) {
    const parsedColor = parseColorValue(value);
    const hexInput = document.createElement('input');
    const alphaInput = document.createElement('input');
    const unit = createElement('span', {
        className: 'text-color-unit',
        textContent: '%',
    });

    hexInput.type = 'text';
    hexInput.className = 'text-color-value text-color-hex-input';
    hexInput.maxLength = 6;
    hexInput.value = parsedColor.hex;
    hexInput.inputMode = 'text';
    hexInput.setAttribute('autocomplete', 'off');
    hexInput.setAttribute('aria-label', '自定义颜色 HEX');
    alphaInput.type = 'number';
    alphaInput.className = 'text-color-opacity text-color-alpha-input';
    alphaInput.min = '0';
    alphaInput.max = '100';
    alphaInput.step = '1';
    alphaInput.value = String(parsedColor.alpha);
    alphaInput.inputMode = 'numeric';
    alphaInput.setAttribute('aria-label', '自定义颜色不透明度');

    function commitColor(nextHex, nextAlpha, event) {
        const nextValue = normalizeColorValue(`#${normalizeHexDraft(nextHex, parsedColor.hex)}${alphaPercentToHex(nextAlpha)}`);
        context.state.updateTemplateTextColor(context.template, paletteItem.id, nextValue);
        commitTextObjectColorValue(context, item, tokenField, colorField, {
            token: '',
            color: nextValue,
            renderEditor: false,
        });
        event.currentTarget.closest('.text-color-row')?.style.setProperty('--text-color-swatch', nextValue);
    }

    hexInput.addEventListener('input', (event) => {
        const nextHex = sanitizeHexDraft(event.target.value);
        hexInput.value = nextHex;
        if (nextHex.length === 6) {
            commitColor(nextHex, alphaInput.value, event);
        }
    });
    hexInput.addEventListener('change', (event) => {
        const nextHex = normalizeHexDraft(event.target.value, parsedColor.hex);
        hexInput.value = nextHex;
        commitColor(nextHex, alphaInput.value, event);
    });
    alphaInput.addEventListener('input', (event) => {
        alphaInput.value = String(Math.round(clampNumber(event.target.value, 0, 100)));
        commitColor(hexInput.value, alphaInput.value, event);
    });
    alphaInput.addEventListener('change', (event) => {
        alphaInput.value = String(Math.round(clampNumber(event.target.value, 0, 100)));
        commitColor(hexInput.value, alphaInput.value, event);
    });

    return [hexInput, alphaInput, unit];
}

function createTextColorRow(context, item, tokenField, colorField, option) {
    const isCustom = option.type === 'custom';
    const value = option.color;
    const shell = createElement('div', {
        className: [
            'text-color-row-shell',
            isCustom ? 'text-color-row-shell-custom' : '',
        ].filter(Boolean).join(' '),
    });
    const row = createElement('div', {
        className: [
            'text-color-row',
            isCustom ? 'text-color-row-custom' : '',
            option.selected ? 'selected' : '',
        ].filter(Boolean).join(' '),
        attributes: {
            role: 'button',
            tabindex: '0',
            'aria-pressed': option.selected ? 'true' : 'false',
        },
        styleProperties: {
            '--text-color-swatch': value,
        },
    });
    const swatch = createElement('span', {
        className: 'text-color-swatch',
        attributes: {
            'aria-hidden': 'true',
        },
    });
    const valueNodes = isCustom && option.selected
        ? createTextColorValueInputs(context, item, tokenField, colorField, option.paletteItem, value)
        : createTextColorValueDisplay(value);
    const selectColor = () => {
        commitTextObjectColorValue(context, item, tokenField, colorField, {
            token: isCustom ? '' : option.token,
            color: value,
            renderEditor: true,
        });
    };
    const removeButton = isCustom
        ? createIconButton({
            className: 'text-color-row-remove',
            label: '删除自定义颜色',
            iconPaths: MINUS_ICON_PATHS,
            onClick: (event) => {
                const defaultOption = getTextColorDefaultOption(tokenField);
                context.state.removeTemplateTextColor(context.template, option.paletteItem.id);
                event.stopPropagation();

                if (option.selected && defaultOption) {
                    commitTextObjectColorValue(context, item, tokenField, colorField, {
                        token: defaultOption.value,
                        color: getColorOptionValue(defaultOption),
                        renderEditor: true,
                    });
                    return;
                }

                context.actions.renderInspector();
            },
        })
        : null;

    row.addEventListener('click', (event) => {
        if (event.target.closest('button, input')) {
            return;
        }

        selectColor();
    });
    row.addEventListener('keydown', (event) => {
        if (event.target.closest('input')) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectColor();
        }
    });

    row.append(swatch, ...valueNodes);
    if (removeButton) {
        shell.append(row, removeButton);
        return shell;
    }

    shell.appendChild(row);

    return shell;
}

function createTextColorPanel(context, item, fields) {
    const colorFields = getTextColorFields(fields);
    if (!colorFields) {
        return null;
    }

    const { tokenField, colorField } = colorFields;
    const { state, template } = context;
    const tokenValue = getTextColorTokenValue(item, tokenField);
    const customValue = getTextColorCustomValue(item, colorField);
    const palette = state.getTemplateTextColorPalette(template);
    const selectedCustom = !tokenValue
        ? palette.find((paletteItem) => normalizeColorValue(paletteItem.value) === customValue)
        : null;
    const tokenOptions = (tokenField.options ?? []).map((option) => ({
        type: 'token',
        token: option.value,
        color: getColorOptionValue(option),
        selected: tokenValue === option.value,
    }));
    const customOptions = palette.map((paletteItem) => ({
        type: 'custom',
        paletteItem,
        color: normalizeColorValue(paletteItem.value),
        selected: selectedCustom?.id === paletteItem.id,
    }));
    const addButton = createIconButton({
        className: 'text-color-add-button',
        label: '添加自定义颜色',
        iconPaths: PLUS_ICON_PATHS,
        onClick: () => {
            const nextItem = state.addTemplateTextColor(
                template,
                getTextObjectEffectiveColor(item, tokenField, colorField)
            );
            if (!nextItem) {
                return;
            }

            commitTextObjectColorValue(context, item, tokenField, colorField, {
                token: '',
                color: nextItem.value,
                renderEditor: true,
            });
        },
    });
    const header = createElement('div', {
        className: 'text-color-panel-header',
        children: [
            createElement('div', {
                className: 'field-group-label text-color-panel-title',
                textContent: '颜色',
            }),
            createElement('div', {
                className: 'text-color-panel-actions',
                children: [addButton],
            }),
        ],
    });
    const rows = createElement('div', {
        className: 'text-color-row-list',
        children: [...tokenOptions, ...customOptions].map((option) => (
            createTextColorRow(context, item, tokenField, colorField, option)
        )),
    });

    return createElement('div', {
        className: 'text-color-panel field-group field-frame-gray',
        children: [header, rows],
    });
}

function createTextObjectStructuredFieldList(fields, fieldOptions, {
    rootGroup = false,
} = {}) {
    const anchorLayoutFieldKeys = new Set(['region', 'anchor']);
    const pairedFieldKeyGroups = [
        ['rotation', 'align'],
        ['direction', 'gapScale'],
        ['offsetXScale', 'offsetYScale'],
        ['style.fontStyle', 'style.fontWeight'],
        ['style.fontScale', 'style.letterSpacingScale'],
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
    const visibleFields = fields.filter((field) => !isTextColorField(field));
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
        ? createTextObjectStructuredFieldList(visibleFields, fieldOptions, {
            rootGroup: item.type === 'group' && depth === 0,
        })
        : createInspectorFieldList(visibleFields, fieldOptions);
    const colorPanel = createTextColorPanel(context, item, fields);

    if (colorPanel) {
        list.appendChild(colorPanel);
    }

    if (item.type === 'image') {
        list.appendChild(createImageSourceControl(context, item));
    }

    return list;
}
