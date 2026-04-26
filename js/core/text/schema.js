export const TEXT_ITEM_TYPES = Object.freeze({
    group: 'group',
    text: 'text',
    separator: 'separator',
    image: 'image',
});

export const TEXT_DIRECTIONS = Object.freeze({
    vertical: 'vertical',
    horizontal: 'horizontal',
});

export const TEXT_ALIGNS = Object.freeze({
    start: 'start',
    center: 'center',
    end: 'end',
});

export const TEXT_EMPTY_BEHAVIORS = Object.freeze({
    hide: 'hide',
    fallback: 'fallback',
    show: 'show',
});

export const FRAME_REGIONS = Object.freeze(['top', 'right', 'bottom', 'left']);

export const ANCHOR_KEYS = Object.freeze([
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
]);

export const DEFAULT_TEXT_STYLE = Object.freeze({
    fontId: 'systemSans',
    fontScale: 1,
    fontWeight: 400,
    fontStyle: 'normal',
    colorToken: 'textPrimary',
    color: '#111111',
    letterSpacingScale: 0,
    lineHeightScale: 1.12,
});

export const DEFAULT_GROUP = Object.freeze({
    type: TEXT_ITEM_TYPES.group,
    label: '文本组',
    direction: TEXT_DIRECTIONS.vertical,
    align: TEXT_ALIGNS.center,
    gapScale: 0.4,
    offsetXScale: 0,
    offsetYScale: 0,
    visible: true,
});

export const DEFAULT_TEXT_ITEM = Object.freeze({
    type: TEXT_ITEM_TYPES.text,
    label: '文字',
    content: '',
    fallbackContent: '',
    emptyBehavior: TEXT_EMPTY_BEHAVIORS.hide,
    visible: true,
});

export const DEFAULT_SEPARATOR_ITEM = Object.freeze({
    type: TEXT_ITEM_TYPES.separator,
    label: '分隔线',
    lengthScale: 1.4,
    thicknessScale: 0.06,
    visible: true,
    forceVisible: false,
    colorToken: 'separator',
    color: '#9CA3AF',
});

export const DEFAULT_IMAGE_ITEM = Object.freeze({
    type: TEXT_ITEM_TYPES.image,
    label: '图片',
    source: null,
    visible: true,
});

const STYLE_KEYS = [
    'fontId',
    'fontIdEn',
    'fontIdZh',
    'fontScale',
    'fontWeight',
    'fontStyle',
    'colorToken',
    'color',
    'letterSpacingScale',
    'lineHeightScale',
];

function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeEnumValue(value, allowedValues, fallbackValue) {
    return allowedValues.includes(value) ? value : fallbackValue;
}

function normalizeBoolean(value, fallbackValue = true) {
    return typeof value === 'boolean' ? value : fallbackValue;
}

function normalizeFiniteNumber(value, fallbackValue = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallbackValue;
}

function normalizeNonNegativeNumber(value, fallbackValue = 0) {
    return Math.max(normalizeFiniteNumber(value, fallbackValue), 0);
}

function normalizeString(value, fallbackValue = '') {
    if (value === null || value === undefined) {
        return fallbackValue;
    }

    return String(value);
}

function normalizeStyle(style = {}, owner = {}) {
    const normalizedStyle = {};
    const styleSource = isObject(style) ? style : {};

    STYLE_KEYS.forEach((key) => {
        const value = styleSource[key] ?? owner[key];
        if (value !== undefined) {
            normalizedStyle[key] = value;
        }
    });

    if (normalizedStyle.fontScale !== undefined) {
        normalizedStyle.fontScale = normalizeNonNegativeNumber(normalizedStyle.fontScale, DEFAULT_TEXT_STYLE.fontScale);
    }

    if (normalizedStyle.fontWeight !== undefined) {
        normalizedStyle.fontWeight = normalizeFiniteNumber(normalizedStyle.fontWeight, DEFAULT_TEXT_STYLE.fontWeight);
    }

    if (normalizedStyle.letterSpacingScale !== undefined) {
        normalizedStyle.letterSpacingScale = normalizeFiniteNumber(
            normalizedStyle.letterSpacingScale,
            DEFAULT_TEXT_STYLE.letterSpacingScale
        );
    }

    if (normalizedStyle.lineHeightScale !== undefined) {
        normalizedStyle.lineHeightScale = normalizeNonNegativeNumber(
            normalizedStyle.lineHeightScale,
            DEFAULT_TEXT_STYLE.lineHeightScale
        );
    }

    return normalizedStyle;
}

function normalizeId(value, fallbackId) {
    const id = normalizeString(value, '').trim();
    return id || fallbackId;
}

function normalizeTextItem(item, fallbackId) {
    return {
        ...DEFAULT_TEXT_ITEM,
        ...item,
        id: normalizeId(item.id, fallbackId),
        type: TEXT_ITEM_TYPES.text,
        label: normalizeString(item.label, DEFAULT_TEXT_ITEM.label),
        content: normalizeString(item.content ?? item.text, DEFAULT_TEXT_ITEM.content),
        fallbackContent: normalizeString(
            item.fallbackContent ?? item.fallbackText,
            DEFAULT_TEXT_ITEM.fallbackContent
        ),
        emptyBehavior: normalizeEnumValue(
            item.emptyBehavior,
            Object.values(TEXT_EMPTY_BEHAVIORS),
            DEFAULT_TEXT_ITEM.emptyBehavior
        ),
        visible: normalizeBoolean(item.visible, DEFAULT_TEXT_ITEM.visible),
        style: normalizeStyle(item.style, item),
    };
}

function normalizeSeparatorItem(item, fallbackId) {
    return {
        ...DEFAULT_SEPARATOR_ITEM,
        ...item,
        id: normalizeId(item.id, fallbackId),
        type: TEXT_ITEM_TYPES.separator,
        label: normalizeString(item.label, DEFAULT_SEPARATOR_ITEM.label),
        lengthScale: normalizeNonNegativeNumber(item.lengthScale, DEFAULT_SEPARATOR_ITEM.lengthScale),
        thicknessScale: normalizeNonNegativeNumber(item.thicknessScale, DEFAULT_SEPARATOR_ITEM.thicknessScale),
        visible: normalizeBoolean(item.visible, DEFAULT_SEPARATOR_ITEM.visible),
        forceVisible: normalizeBoolean(item.forceVisible, DEFAULT_SEPARATOR_ITEM.forceVisible),
        colorToken: normalizeString(item.colorToken, DEFAULT_SEPARATOR_ITEM.colorToken),
        color: normalizeString(item.color, DEFAULT_SEPARATOR_ITEM.color),
    };
}

function normalizeImageItem(item, fallbackId) {
    return {
        ...DEFAULT_IMAGE_ITEM,
        ...item,
        id: normalizeId(item.id, fallbackId),
        type: TEXT_ITEM_TYPES.image,
        label: normalizeString(item.label, DEFAULT_IMAGE_ITEM.label),
        source: isObject(item.source) ? { ...item.source } : null,
        visible: normalizeBoolean(item.visible, DEFAULT_IMAGE_ITEM.visible),
        style: normalizeStyle(item.style, item),
    };
}

function normalizeLegacyTexts(group) {
    if (Array.isArray(group.items)) {
        return group.items;
    }

    if (!Array.isArray(group.texts)) {
        return [];
    }

    return group.texts.map((text, index) => ({
        id: text.id,
        type: TEXT_ITEM_TYPES.text,
        label: text.label,
        content: text.text ?? text.fallbackText ?? '',
        fallbackContent: text.fallbackText ?? '',
        visible: text.visible,
        style: normalizeStyle(text, text),
        _legacyIndex: index,
    }));
}

function normalizeGroupItem(item, fallbackId, depth) {
    const items = normalizeLegacyTexts(item)
        .map((child, index) => normalizeItem(child, `${fallbackId}-item-${index + 1}`, depth + 1))
        .filter(Boolean);

    return {
        ...DEFAULT_GROUP,
        ...item,
        id: normalizeId(item.id, fallbackId),
        type: TEXT_ITEM_TYPES.group,
        label: normalizeString(item.label, DEFAULT_GROUP.label),
        region: depth === 0
            ? normalizeEnumValue(item.region, FRAME_REGIONS, 'bottom')
            : undefined,
        anchor: depth === 0
            ? normalizeEnumValue(item.anchor, ANCHOR_KEYS, 'center')
            : undefined,
        direction: normalizeEnumValue(
            item.direction,
            Object.values(TEXT_DIRECTIONS),
            DEFAULT_GROUP.direction
        ),
        align: normalizeEnumValue(
            item.align,
            Object.values(TEXT_ALIGNS),
            DEFAULT_GROUP.align
        ),
        gapScale: normalizeNonNegativeNumber(item.gapScale ?? item.gapRatio, DEFAULT_GROUP.gapScale),
        offsetXScale: depth === 0
            ? normalizeFiniteNumber(item.offsetXScale ?? item.offsetXRatio, DEFAULT_GROUP.offsetXScale)
            : undefined,
        offsetYScale: depth === 0
            ? normalizeFiniteNumber(item.offsetYScale ?? item.offsetYRatio, DEFAULT_GROUP.offsetYScale)
            : undefined,
        visible: normalizeBoolean(item.visible, DEFAULT_GROUP.visible),
        style: normalizeStyle(item.style, item),
        items,
    };
}

function normalizeItem(item, fallbackId, depth) {
    if (!isObject(item)) {
        return null;
    }

    const type = item.type ?? (Array.isArray(item.items) || Array.isArray(item.texts)
        ? TEXT_ITEM_TYPES.group
        : TEXT_ITEM_TYPES.text);

    if (type === TEXT_ITEM_TYPES.group) {
        if (depth > 1) {
            return null;
        }

        return normalizeGroupItem(item, fallbackId, depth);
    }

    if (type === TEXT_ITEM_TYPES.text) {
        return normalizeTextItem(item, fallbackId);
    }

    if (type === TEXT_ITEM_TYPES.separator) {
        return normalizeSeparatorItem(item, fallbackId);
    }

    if (type === TEXT_ITEM_TYPES.image) {
        return normalizeImageItem(item, fallbackId);
    }

    return null;
}

export function normalizeTextModel(textModel) {
    const groups = Array.isArray(textModel)
        ? textModel
        : (Array.isArray(textModel?.groups) ? textModel.groups : []);

    return groups
        .map((group, index) => normalizeItem(group, `text-group-${index + 1}`, 0))
        .filter(Boolean)
        .filter((group) => group.type === TEXT_ITEM_TYPES.group);
}

let generatedTextObjectId = 0;

export function createTextObjectId(prefix = 'text') {
    generatedTextObjectId += 1;
    return `${prefix}-${Date.now()}-${generatedTextObjectId}`;
}

export function createDefaultTextItem(type = TEXT_ITEM_TYPES.text, overrides = {}) {
    if (type === TEXT_ITEM_TYPES.separator) {
        return {
            ...DEFAULT_SEPARATOR_ITEM,
            id: createTextObjectId('separator'),
            ...overrides,
        };
    }

    if (type === TEXT_ITEM_TYPES.image) {
        return {
            ...DEFAULT_IMAGE_ITEM,
            id: createTextObjectId('image'),
            ...overrides,
        };
    }

    if (type === TEXT_ITEM_TYPES.group) {
        return {
            ...DEFAULT_GROUP,
            id: createTextObjectId('subgroup'),
            label: '子组',
            direction: TEXT_DIRECTIONS.horizontal,
            style: { ...DEFAULT_TEXT_STYLE },
            items: [],
            ...overrides,
        };
    }

    return {
        ...DEFAULT_TEXT_ITEM,
        id: createTextObjectId('text'),
        content: 'Text',
        ...overrides,
    };
}

export function createDefaultTextGroup(overrides = {}) {
    return {
        ...DEFAULT_GROUP,
        id: createTextObjectId('group'),
        region: 'bottom',
        anchor: 'center',
        style: { ...DEFAULT_TEXT_STYLE },
        items: [
            createDefaultTextItem(TEXT_ITEM_TYPES.text),
        ],
        ...overrides,
    };
}

export function cloneTextModel(textModel = []) {
    if (typeof structuredClone === 'function') {
        return structuredClone(textModel);
    }

    return JSON.parse(JSON.stringify(textModel));
}

export function mergeTextStyles(...styles) {
    return styles.reduce((result, style) => ({
        ...result,
        ...(isObject(style) ? style : {}),
    }), {});
}

export function getTextBaseUnit(metrics = {}) {
    const baseUnit = Number(metrics.scaledFontSize);
    return Number.isFinite(baseUnit) && baseUnit > 0 ? baseUnit : 12;
}
