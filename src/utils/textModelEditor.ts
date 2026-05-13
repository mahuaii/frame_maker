import { normalizeTextModel } from '../../js/core/text/index.js';
import { resolveTemplateAppearance } from '../../js/core/templates/registry.ts';
import { getPathValue, setPathValue } from '../../js/core/utils/object-path.ts';
import {
    getFontFieldOptions,
    getFontWeightOptions,
    normalizeFontWeightForFont,
} from '../../js/core/fonts/index.js';
import type { InspectorField } from '../types/inspector';
import type { FrameTemplate } from '../types/template';
import type {
    TextColorPaletteItem,
    TextImageSource,
    TextModel,
    TextObject,
    TextObjectDropPosition,
    TextObjectLocation,
    TextStyle,
} from '../types/text';

export type TextEditorField = InspectorField & {
    groupClassName?: string;
};

const TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS = new Set(['label', 'style.fontId', 'style.fontStyle']);
const TEXT_EDITOR_WHITE_FIELD_KEYS = new Set(['rotation', 'align', 'direction', 'style.fontWeight']);
const GAP_SCALE_PREFIX_ICON_PATH = 'M15.5 7a.5.5 0 0 1 0 1h-.25a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25h.25a.5.5 0 0 1 0 1h-.25C14.56 16 14 15.44 14 14.75v-6.5C14 7.56 14.56 7 15.25 7zm-8.5.5a.5.5 0 0 1 .5-.5h.25C8.44 7 9 7.56 9 8.25v6.5C9 15.44 8.44 16 7.75 16H7.5a.5.5 0 0 1 0-1h.25a.25.25 0 0 0 .25-.25v-6.5A.25.25 0 0 0 7.75 8H7.5a.5.5 0 0 1-.5-.5m4 2a.5.5 0 0 1 1 0v4a.5.5 0 0 1-1 0z';
const FONT_SCALE_PREFIX_ICON_PATH = 'M9.88 6.3a.6.6 0 0 1 1.11 0l3.5 9.2a.6.6 0 1 1-1.12.43l-.85-2.23H8.35l-.84 2.23a.6.6 0 1 1-1.12-.43zm.56 1.9-1.64 4.3h3.27zm6.43 2.06a.48.48 0 0 1 .9 0l1.82 4.91a.49.49 0 1 1-.91.34l-.34-.91h-2.05l-.33.91a.49.49 0 0 1-.91-.34zm.45 1.5-.67 1.85h1.34z';
const LETTER_SPACING_PREFIX_ICON_PATH = 'M6.5 6a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5m11 0a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5m-5.25 3a.5.5 0 0 1 .472.335l1.75 5a.5.5 0 1 1-.944.33l-.407-1.165H10.88l-.407 1.165a.5.5 0 1 1-.944-.33l1.75-5 .032-.072A.5.5 0 0 1 11.75 9zm-1.02 3.5h1.54L12 10.298z';
const OFFSET_PREFIX_ICON_PATH = 'M16.5 8.5a.5.5 0 0 1 .5.5v5a.5.5 0 1 1-1 0v-2H7v2a.5.5 0 0 1-1 0V9a.5.5 0 0 1 1 0v2h9V9a.5.5 0 0 1 .5-.5';
const SEPARATOR_LENGTH_PREFIX_ICON_PATHS = [
    'M5 6.5h14',
    'M5 17.5h14',
    'M7 12h10',
    'M7 12l2-2',
    'M7 12l2 2',
    'M17 12l-2-2',
    'M17 12l-2 2',
];
const SEPARATOR_THICKNESS_PREFIX_ICON_PATH = 'M6 6.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5M7 10v1h10v-1zm-.25-1a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75zM7 17v-2h10v2zm-1-2.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75z';

export const TEXT_STANDALONE_FIELD_KEYS = new Set(['label', 'content']);
export const TEXT_LAYOUT_FIELD_KEYS = new Set([
    'region',
    'anchor',
    'rotation',
    'align',
    'direction',
    'gapScale',
    'offsetXScale',
    'offsetYScale',
    'forceVisible',
    'lengthScale',
    'thicknessScale',
]);
export const TEXT_FONT_FIELD_KEYS = new Set([
    'style.fontId',
    'style.fontStyle',
    'style.fontWeight',
    'style.fontOverride',
    'style.fontScale',
    'style.letterSpacingScale',
]);

export const DEFAULT_TEXT_OBJECT_FONT_ID = 'systemSans';
export const DEFAULT_TEXT_OBJECT_FONT_WEIGHT = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function buildTextColorTokenField(
    appearanceThemes: FrameTemplate['appearanceThemes'],
    activeThemeKey: string,
    {
        key = 'style.colorToken',
        label = '颜色',
        defaultValue,
        group = 'text',
    }: {
        key?: string;
        label?: string;
        defaultValue?: string;
        group?: string;
    } = {}
): TextEditorField {
    const theme = appearanceThemes?.[activeThemeKey]
        ?? Object.values(appearanceThemes ?? {})[0]
        ?? {};
    const colors = isRecord(theme.colors?.[group]) ? theme.colors[group] : {};
    const entries = Object.entries(colors).filter((entry): entry is [string, string] => (
        typeof entry[1] === 'string'
    ));
    const defaultExists = defaultValue !== undefined && entries.some(([token]) => token === defaultValue);
    const fallbackValue = defaultExists ? defaultValue : entries[0]?.[0] ?? '';

    return {
        key,
        label,
        type: 'select',
        control: 'color-buttons',
        defaultValue: fallbackValue,
        options: entries.map(([token, color]) => ({
            value: token,
            label: token,
            swatch: color,
            displayValue: color.replace(/^#/, '').toUpperCase(),
        })),
    };
}

export function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export function createTemplateTextModel(template: FrameTemplate): TextModel {
    return normalizeTextModel(cloneJson(template.textGroups ?? [])) as TextModel;
}

export function cloneEditorTextModel(textModel: TextModel = []): TextModel {
    return normalizeTextModel(cloneJson(textModel)) as TextModel;
}

export function createTextColorPaletteItem(value = '#000000FF'): TextColorPaletteItem {
    return {
        id: `text-color-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        value,
    };
}

export function getTextObjectTypeLabel(item: TextObject | null | undefined) {
    const labels: Record<string, string> = {
        group: '组',
        text: '文',
        separator: '线',
        image: '图',
    };

    return labels[item?.type ?? ''] ?? '?';
}

export function summarizeTextObjectContent(value: unknown) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

export function getFirstTextObjectContent(item: TextObject | null | undefined): string {
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

export function getTextObjectDisplayLabel(item: TextObject | null | undefined, depth = 0) {
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

export function findTextObjectById(
    items: TextObject[] = [],
    objectId: string | null | undefined,
    parent: TextObject | null = null,
    depth = 0
): TextObjectLocation | null {
    if (!objectId) {
        return null;
    }

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.id === objectId) {
            return { item, parent: parent?.type === 'group' ? parent : null, index, depth, siblings: items };
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

export function getTextObjectAncestors(
    items: TextObject[] = [],
    objectId: string | null | undefined,
    ancestors: TextObject[] = []
): TextObject[] | null {
    if (!objectId) {
        return null;
    }

    for (const item of items) {
        if (item.id === objectId) {
            return ancestors;
        }

        if (item.type === 'group') {
            const childAncestors = getTextObjectAncestors(item.items ?? [], objectId, [...ancestors, item]);
            if (childAncestors) {
                return childAncestors;
            }
        }
    }

    return null;
}

export function getTextGroupUsesFontOverride(item: TextObject | null | undefined) {
    const explicitValue = getPathValue(item, 'style.fontOverride');
    return typeof explicitValue === 'boolean' ? explicitValue : false;
}

export function hasAncestorFontOverride(items: TextObject[] = [], objectId: string | null | undefined) {
    return (getTextObjectAncestors(items, objectId) ?? []).some((item) => getTextGroupUsesFontOverride(item));
}

export function isTextObjectDescendantOf(item: TextObject | null | undefined, objectId: string | null | undefined) {
    if (!item || !objectId) {
        return false;
    }

    if (item.id === objectId) {
        return true;
    }

    if (item.type !== 'group' || !Array.isArray(item.items)) {
        return false;
    }

    return item.items.some((child) => isTextObjectDescendantOf(child, objectId));
}

export function getTextObjectVisibilityState(item: TextObject, parentHidden = false) {
    const selfHidden = item.visible === false;

    return {
        selfHidden,
        hidden: parentHidden || selfHidden,
        label: selfHidden ? '显示' : '隐藏',
    };
}

export type FlatTextObject = TextObjectLocation & {
    hidden: boolean;
    selfHidden: boolean;
};

export function flattenTextModel(items: TextObject[] = [], parentHidden = false): FlatTextObject[] {
    const rows: FlatTextObject[] = [];

    function visit(children: TextObject[] = [], parent: TextObject | null, depth: number, inheritedHidden: boolean) {
        children.forEach((item, index) => {
            const visibility = getTextObjectVisibilityState(item, inheritedHidden);
            rows.push({
                item,
                parent: parent?.type === 'group' ? parent : null,
                index,
                depth,
                siblings: children,
                hidden: visibility.hidden,
                selfHidden: visibility.selfHidden,
            });

            if (item.type === 'group') {
                visit(item.items ?? [], item, depth + 1, visibility.hidden);
            }
        });
    }

    items.forEach((item, index) => {
        const visibility = getTextObjectVisibilityState(item, parentHidden);
        rows.push({
            item,
            parent: null,
            index,
            depth: 0,
            siblings: items,
            hidden: visibility.hidden,
            selfHidden: visibility.selfHidden,
        });

        if (item.type === 'group') {
            visit(item.items ?? [], item, 1, item.visible === false);
        }
    });

    return rows;
}

export function getFallbackSelectedTextObjectId(textModel: TextModel = []) {
    return textModel[0]?.id ?? null;
}

export function ensureSelectedTextObjectId(textModel: TextModel = [], selectedId: string | null) {
    return findTextObjectById(textModel, selectedId) ? selectedId : getFallbackSelectedTextObjectId(textModel);
}

export function getTextObjectDropPosition(
    source: TextObjectLocation | null,
    target: TextObjectLocation | null,
    pointerY: number,
    targetTop: number,
    targetHeight: number
): TextObjectDropPosition | null {
    if (!source || !target) {
        return null;
    }

    const sourceIsRootGroup = source.depth === 0 && source.item.type === 'group';

    if (!sourceIsRootGroup && target.depth === 0 && target.item.type === 'group') {
        return 'inside';
    }

    return pointerY < targetTop + targetHeight / 2 ? 'before' : 'after';
}

export function isValidTextObjectDrop(
    source: TextObjectLocation | null,
    target: TextObjectLocation | null,
    position: TextObjectDropPosition | null
) {
    if (!source || !target || !position || source.item.id === target.item.id) {
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

export function moveTextObjectById(
    model: TextModel,
    sourceId: string,
    targetId: string,
    position: TextObjectDropPosition
) {
    const source = findTextObjectById(model, sourceId);
    const target = findTextObjectById(model, targetId);

    if (!isValidTextObjectDrop(source, target, position)) {
        return false;
    }

    const [movedItem] = source!.siblings.splice(source!.index, 1);
    const nextTarget = findTextObjectById(model, targetId);
    if (!nextTarget) {
        source!.siblings.splice(source!.index, 0, movedItem);
        return false;
    }

    if (position === 'inside') {
        if (nextTarget.item.type !== 'group') {
            source!.siblings.splice(source!.index, 0, movedItem);
            return false;
        }

        nextTarget.item.items = Array.isArray(nextTarget.item.items) ? nextTarget.item.items : [];
        nextTarget.item.items.push(movedItem);
        return true;
    }

    const insertIndex = nextTarget.index + (position === 'after' ? 1 : 0);
    nextTarget.siblings.splice(insertIndex, 0, movedItem);
    return true;
}

export function getTextObjectFontId(item: TextObject | null | undefined) {
    return getPathValue(item, 'style.fontId') ?? DEFAULT_TEXT_OBJECT_FONT_ID;
}

export function getTextObjectFontWeight(item: TextObject, fontId = getTextObjectFontId(item)) {
    return normalizeFontWeightForFont(
        getPathValue(item, 'style.fontWeight') ?? DEFAULT_TEXT_OBJECT_FONT_WEIGHT,
        fontId
    );
}

function applyTextEditorFieldFrameStyle(fields: TextEditorField[] = []) {
    return fields.map((field) => {
        if (!field || TEXT_EDITOR_GRAY_EXCLUDED_FIELD_KEYS.has(field.key)) {
            return field;
        }

        const classNames = new Set(String(field.groupClassName ?? '').split(/\s+/).filter(Boolean));
        if (TEXT_EDITOR_WHITE_FIELD_KEYS.has(field.key)) {
            classNames.delete('field-frame-gray');
            classNames.add('field-frame-white');
        } else {
            classNames.add('field-frame-gray');
        }

        return {
            ...field,
            groupClassName: Array.from(classNames).join(' '),
        };
    });
}

function buildTextObjectStyleFields(
    template: FrameTemplate,
    activeAppearanceKey: string,
    fontFields: TextEditorField[],
    { includeFontFields = true } = {}
): TextEditorField[] {
    return [
        ...(includeFontFields ? fontFields : []),
        {
            key: 'style.fontScale',
            label: '字号倍率',
            type: 'number',
            min: 0.1,
            step: 0.05,
            defaultValue: 1,
            prefixIconPaths: [{
                d: FONT_SCALE_PREFIX_ICON_PATH,
                fill: 'var(--fpl-icon-color, var(--color-icon))',
            }],
            prefixIconViewBox: '5.5 5.5 15 11',
        },
        buildTextColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
            key: 'style.colorToken',
            label: '颜色',
            defaultValue: 'textPrimary',
            group: 'text',
        }),
        { key: 'style.color', label: '自定义颜色', type: 'color', defaultValue: '#000000EE' },
        {
            key: 'style.letterSpacingScale',
            label: '字距',
            type: 'number',
            step: 0.01,
            defaultValue: 0,
            prefixIconPaths: [{
                d: LETTER_SPACING_PREFIX_ICON_PATH,
                fill: 'var(--fpl-icon-color, var(--color-icon))',
            }],
            prefixIconViewBox: '5.5 5.5 13 13',
        },
    ];
}

export function buildTextObjectFieldDefinitions(
    item: TextObject,
    depth: number,
    template: FrameTemplate,
    fieldValues: Record<string, unknown>,
    { inheritedFontOverride = false } = {}
): TextEditorField[] {
    const activeAppearanceKey = resolveTemplateAppearance(template, fieldValues).key;
    const fontId = getTextObjectFontId(item);
    const usesFontOverride = item.type === 'group' ? getTextGroupUsesFontOverride(item) : false;
    const fontFields: TextEditorField[] = inheritedFontOverride ? [] : [
        {
            key: 'style.fontId',
            label: '字体',
            type: 'select',
            defaultValue: DEFAULT_TEXT_OBJECT_FONT_ID,
            options: getFontFieldOptions(),
        },
        {
            key: 'style.fontStyle',
            label: '字体',
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
                control: 'text-rotation-radio',
                defaultValue: 0,
                options: [
                    { value: '0', label: '正常' },
                    { value: '90', label: '顺时针 90°' },
                    { value: '180', label: '倒置 180°' },
                    { value: '270', label: '逆时针 90°' },
                ],
            },
            {
                key: 'align',
                label: '对齐',
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
                label: '排列',
                type: 'select',
                control: 'text-direction-radio',
                defaultValue: 'vertical',
                options: [
                    { value: 'vertical', label: '垂直' },
                    { value: 'horizontal', label: '水平' },
                ],
            },
            {
                key: 'gapScale',
                label: '组内间距',
                type: 'number',
                step: 0.05,
                defaultValue: 0.4,
                prefixIconPaths: [{
                    d: GAP_SCALE_PREFIX_ICON_PATH,
                    fill: 'var(--fpl-icon-color, var(--color-icon))',
                    fillRule: 'evenodd',
                    clipRule: 'evenodd',
                }],
                prefixIconViewBox: '6 6 12 12',
            },
            ...(depth === 0 ? [
                {
                    key: 'offsetXScale',
                    label: 'X 偏移',
                    type: 'number',
                    step: 0.1,
                    defaultValue: 0,
                    prefixIconPaths: [{
                        d: OFFSET_PREFIX_ICON_PATH,
                        fill: 'var(--fpl-icon-color, var(--color-icon))',
                        fillRule: 'evenodd',
                        clipRule: 'evenodd',
                    }],
                    prefixIconViewBox: '5.5 8 12 7',
                },
                {
                    key: 'offsetYScale',
                    label: 'Y 偏移',
                    type: 'number',
                    step: 0.1,
                    defaultValue: 0,
                    prefixIconPaths: [{
                        d: OFFSET_PREFIX_ICON_PATH,
                        fill: 'var(--fpl-icon-color, var(--color-icon))',
                        fillRule: 'evenodd',
                        clipRule: 'evenodd',
                    }],
                    prefixIconViewBox: '9 5.5 7 13',
                    prefixIconRotation: 90,
                    prefixIconRotationCenter: '11.625 12.125',
                },
            ] : []),
            {
                key: 'style.fontOverride',
                label: '字体覆盖',
                type: 'toggle',
                defaultValue: usesFontOverride,
            },
            ...styleFields,
        ]);
    }

    if (item.type === 'text') {
        return applyTextEditorFieldFrameStyle([
            { key: 'content', label: '内容', type: 'textarea', defaultValue: '' },
            ...buildTextObjectStyleFields(template, activeAppearanceKey, fontFields, {
                includeFontFields: true,
            }),
        ]);
    }

    if (item.type === 'separator') {
        return applyTextEditorFieldFrameStyle([
            { key: 'forceVisible', label: '强制显示', type: 'toggle', defaultValue: false },
            {
                key: 'lengthScale',
                label: '长度',
                type: 'number',
                min: 0.1,
                step: 0.05,
                defaultValue: 1.4,
                prefixIconPaths: SEPARATOR_LENGTH_PREFIX_ICON_PATHS.map((path) => ({
                    d: path,
                    fill: 'none',
                    stroke: 'var(--fpl-icon-color, var(--color-icon))',
                    strokeWidth: 1.4,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                })),
                prefixIconViewBox: '4 4 16 16',
            },
            {
                key: 'thicknessScale',
                label: '粗细',
                type: 'number',
                min: 0.01,
                step: 0.01,
                defaultValue: 0.06,
                prefixIconPaths: [{
                    d: SEPARATOR_THICKNESS_PREFIX_ICON_PATH,
                    fill: 'var(--fpl-icon-color, var(--color-icon))',
                    fillRule: 'evenodd',
                    clipRule: 'evenodd',
                }],
                prefixIconViewBox: '4 4 16 16',
            },
            buildTextColorTokenField(template?.appearanceThemes, activeAppearanceKey, {
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

export function getTextObjectFieldValue(item: TextObject, field: TextEditorField) {
    if (field.key === 'style.fontOverride') {
        return getTextGroupUsesFontOverride(item);
    }

    if (field.key === 'style.fontWeight') {
        return getTextObjectFontWeight(item);
    }

    return getPathValue(item, field.key) ?? field.defaultValue ?? '';
}

export function setTextObjectFieldValue(item: TextObject, fieldKey: string, nextValue: unknown) {
    const committedValue = fieldKey === 'style.fontWeight'
        ? getTextObjectFontWeight({
            id: item.id,
            type: item.type,
            style: {
                fontId: getTextObjectFontId(item),
                fontWeight: nextValue,
            } as TextStyle,
        } as TextObject)
        : nextValue;

    setPathValue(item, fieldKey, committedValue);

    if (fieldKey === 'style.fontOverride' && committedValue) {
        if (getPathValue(item, 'style.fontId') === undefined) {
            setPathValue(item, 'style.fontId', DEFAULT_TEXT_OBJECT_FONT_ID);
        }
        if (getPathValue(item, 'style.fontStyle') === undefined) {
            setPathValue(item, 'style.fontStyle', 'normal');
        }
        if (getPathValue(item, 'style.fontWeight') === undefined) {
            setPathValue(item, 'style.fontWeight', DEFAULT_TEXT_OBJECT_FONT_WEIGHT);
        }
    }
}

export function setTextObjectFontId(item: TextObject, nextFontId: string) {
    const nextFontWeight = normalizeFontWeightForFont(
        getPathValue(item, 'style.fontWeight') ?? DEFAULT_TEXT_OBJECT_FONT_WEIGHT,
        nextFontId
    );

    setPathValue(item, 'style.fontId', nextFontId);
    setPathValue(item, 'style.fontWeight', nextFontWeight);
}

export function collectTextModelObjectUrls(textModel: TextModel | TextObject[] = []) {
    const urls = new Set<string>();
    const visit = (items: TextObject[] = []) => {
        items.forEach((item) => {
            if (item.type === 'image' && item.source?.type === 'objectUrl' && item.source.src) {
                urls.add(item.source.src);
            }

            if (item.type === 'group') {
                visit(item.items ?? []);
            }
        });
    };

    visit(textModel as TextObject[]);
    return urls;
}

export function collectTextModelRecordObjectUrls(textModelsByTemplateId: Record<string, TextModel> = {}) {
    const urls = new Set<string>();
    Object.values(textModelsByTemplateId).forEach((textModel) => {
        collectTextModelObjectUrls(textModel).forEach((url) => urls.add(url));
    });
    return urls;
}

function clampNumber(value: unknown, min: number, max: number) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return min;
    }

    return Math.min(Math.max(numericValue, min), max);
}

function toHexChannel(value: unknown) {
    return Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
}

export function alphaHexToPercent(alphaHex: string) {
    const numericValue = Number.parseInt(alphaHex, 16);
    if (!Number.isFinite(numericValue)) {
        return 100;
    }

    return Math.round((numericValue / 255) * 100);
}

export function alphaPercentToHex(alphaPercent: unknown) {
    return toHexChannel((clampNumber(alphaPercent, 0, 100) / 100) * 255);
}

function parseCssAlpha(value: string) {
    const trimmedValue = value.trim();
    if (trimmedValue.endsWith('%')) {
        return clampNumber(Number.parseFloat(trimmedValue), 0, 100);
    }

    return clampNumber(Number.parseFloat(trimmedValue) * 100, 0, 100);
}

export function parseColorValue(value: unknown, fallbackValue = '#000000FF'): { hex: string; alpha: number } {
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

export function normalizeHexDraft(value: unknown, fallbackHex = '000000') {
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

export function sanitizeHexDraft(value: unknown) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

export function normalizeColorValue(value: unknown, fallbackValue = '#000000FF') {
    const parsedColor = parseColorValue(value, fallbackValue);

    return `#${parsedColor.hex}${alphaPercentToHex(parsedColor.alpha)}`;
}

export function formatColorHex(value: unknown) {
    return parseColorValue(value).hex;
}

export function formatColorAlpha(value: unknown) {
    return String(parseColorValue(value).alpha);
}

export function getColorOptionValue(option: { swatch?: string } | null | undefined) {
    return normalizeColorValue(option?.swatch ?? '#000000EE');
}

export function getTextColorFields(fields: TextEditorField[]) {
    const tokenField = fields.find((field) => field.key === 'style.colorToken')
        ?? fields.find((field) => field.key === 'colorToken');
    const colorField = fields.find((field) => field.key === 'style.color')
        ?? fields.find((field) => field.key === 'color');

    return tokenField && colorField ? { tokenField, colorField } : null;
}

export function getTextColorTokenValue(item: TextObject, tokenField: TextEditorField) {
    return getPathValue(item, tokenField.key) ?? tokenField.defaultValue ?? tokenField.options?.[0]?.value ?? '';
}

export function getTextColorCustomValue(item: TextObject, colorField: TextEditorField) {
    return normalizeColorValue(getPathValue(item, colorField.key) ?? colorField.defaultValue ?? '#000000FF');
}

export function getTextColorDefaultOption(tokenField: TextEditorField) {
    const defaultValue = tokenField.defaultValue ?? tokenField.options?.[0]?.value ?? '';

    return tokenField.options?.find((option) => option.value === defaultValue)
        ?? tokenField.options?.[0]
        ?? null;
}

export function getTextObjectEffectiveColor(item: TextObject, tokenField: TextEditorField, colorField: TextEditorField) {
    const tokenValue = getTextColorTokenValue(item, tokenField);
    const tokenOption = tokenField.options?.find((option) => option.value === tokenValue);

    return tokenOption ? getColorOptionValue(tokenOption) : getTextColorCustomValue(item, colorField);
}

export function normalizeTextImageSource(source: TextImageSource | null | undefined) {
    if (!isRecord(source)) {
        return null;
    }

    return {
        type: String(source.type ?? 'asset'),
        src: typeof source.src === 'string' ? source.src : '',
        name: typeof source.name === 'string' ? source.name : '',
        crossOrigin: typeof source.crossOrigin === 'string' ? source.crossOrigin : undefined,
    };
}
