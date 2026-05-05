import {
    DEFAULT_TEXT_STYLE,
    TEXT_ALIGNS,
    TEXT_DIRECTIONS,
    TEXT_ITEM_TYPES,
    getTextBaseUnit,
    mergeTextStyles,
    normalizeTextModel,
} from './schema.js';
import { measureImageItem, measureSeparatorItem, measureTextItem } from './measure.js';
import { resolveTextTokenResult } from './tokens.js';

const EMPTY_TEXT_FALLBACK = 'Text';

function hasSize(item) {
    return item && item.width >= 0 && item.height >= 0;
}

function isSeparator(item) {
    return item?.type === TEXT_ITEM_TYPES.separator;
}

function resolveTextContent(item, context) {
    const tokenResult = resolveTextTokenResult(item.content, context);
    const resolvedContent = tokenResult.hasTokens && !tokenResult.hasNonEmptyToken
        ? ''
        : tokenResult.text;

    if (resolvedContent.trim()) {
        return resolvedContent;
    }

    return EMPTY_TEXT_FALLBACK;
}

function filterSeparators(items) {
    const filtered = [];

    items.forEach((item, index) => {
        if (!isSeparator(item) || item.forceVisible) {
            filtered.push(item);
            return;
        }

        const hasPreviousContent = items
            .slice(0, index)
            .some((candidate) => !isSeparator(candidate));
        const hasNextContent = items
            .slice(index + 1)
            .some((candidate) => !isSeparator(candidate));
        const previousKept = filtered[filtered.length - 1];

        if (hasPreviousContent && hasNextContent && !isSeparator(previousKept)) {
            filtered.push(item);
        }
    });

    return filtered;
}

function getAlignedOffset(availableSize, itemSize, align) {
    if (align === TEXT_ALIGNS.end) {
        return availableSize - itemSize;
    }

    if (align === TEXT_ALIGNS.center) {
        return (availableSize - itemSize) / 2;
    }

    return 0;
}

function layoutMeasuredItems(items, group) {
    const gap = getTextBaseUnit(group.context?.metrics) * group.gapScale;
    const isHorizontal = group.direction === TEXT_DIRECTIONS.horizontal;
    const mainSizeKey = isHorizontal ? 'width' : 'height';
    const crossSizeKey = isHorizontal ? 'height' : 'width';
    const mainPositionKey = isHorizontal ? 'x' : 'y';
    const crossPositionKey = isHorizontal ? 'y' : 'x';
    const mainSize = items.reduce((sum, item) => sum + item[mainSizeKey], 0)
        + gap * Math.max(items.length - 1, 0);
    const crossSize = items.reduce((maxSize, item) => Math.max(maxSize, item[crossSizeKey]), 0);
    let cursor = 0;

    const laidOutItems = items.map((item, index) => {
        const positionedItem = {
            ...item,
            x: 0,
            y: 0,
        };

        positionedItem[mainPositionKey] = cursor;
        positionedItem[crossPositionKey] = getAlignedOffset(crossSize, item[crossSizeKey], group.align);
        cursor += item[mainSizeKey] + (index < items.length - 1 ? gap : 0);

        return positionedItem;
    });

    return {
        items: laidOutItems,
        bounds: {
            x: 0,
            y: 0,
            width: isHorizontal ? mainSize : crossSize,
            height: isHorizontal ? crossSize : mainSize,
        },
    };
}

function normalizeRotation(rotation) {
    const numericRotation = Number(rotation);
    return Number.isFinite(numericRotation)
        ? ((numericRotation % 360) + 360) % 360
        : 0;
}

function getRotatedBounds(bounds, rotation) {
    const normalizedRotation = normalizeRotation(rotation);
    const swapsAxes = normalizedRotation === 90 || normalizedRotation === 270;

    return {
        x: 0,
        y: 0,
        width: swapsAxes ? bounds.height : bounds.width,
        height: swapsAxes ? bounds.width : bounds.height,
    };
}

async function measureChildItem(ctx, item, inheritedStyle, group, context, depth) {
    if (!item.visible) {
        return null;
    }

    if (item.type === TEXT_ITEM_TYPES.text) {
        const resolvedContent = resolveTextContent(item, context);
        if (resolvedContent === null) {
            return null;
        }

        return measureTextItem(
            ctx,
            { ...item, resolvedContent },
            mergeTextStyles(inheritedStyle, item.style),
            context,
            group.align
        );
    }

    if (item.type === TEXT_ITEM_TYPES.separator) {
        return measureSeparatorItem(item, context, group.direction);
    }

    if (item.type === TEXT_ITEM_TYPES.image) {
        return measureImageItem(
            item,
            mergeTextStyles(inheritedStyle, item.style),
            context
        );
    }

    if (item.type === TEXT_ITEM_TYPES.group && depth < 1) {
        return layoutGroup(ctx, item, inheritedStyle, context, depth + 1);
    }

    return null;
}

async function layoutGroup(ctx, group, inheritedStyle, context, depth) {
    if (!group.visible) {
        return null;
    }

    const groupStyle = mergeTextStyles(inheritedStyle, group.style);
    const measuredItems = [];

    for (const item of group.items) {
        const measuredItem = await measureChildItem(ctx, item, groupStyle, group, context, depth);
        if (hasSize(measuredItem)) {
            measuredItems.push(measuredItem);
        }
    }

    const visibleItems = filterSeparators(measuredItems);
    if (visibleItems.length === 0) {
        return null;
    }

    const layout = layoutMeasuredItems(visibleItems, {
        ...group,
        context,
    });
    const bounds = getRotatedBounds(layout.bounds, group.rotation);

    return {
        type: TEXT_ITEM_TYPES.group,
        id: group.id,
        label: group.label,
        region: group.region,
        anchor: group.anchor,
        direction: group.direction,
        rotation: group.rotation,
        align: group.align,
        width: bounds.width,
        height: bounds.height,
        x: 0,
        y: 0,
        bounds,
        unrotatedBounds: layout.bounds,
        items: layout.items,
        style: groupStyle,
        isTopLevel: depth === 0,
        offsetXScale: group.offsetXScale ?? 0,
        offsetYScale: group.offsetYScale ?? 0,
    };
}

function getBoundsAnchorPoint(bounds, anchor = 'center') {
    const horizontal = anchor.endsWith('-left')
        ? 'left'
        : anchor.endsWith('-right')
            ? 'right'
            : 'center';
    const vertical = anchor.startsWith('top-')
        ? 'top'
        : anchor.startsWith('bottom-')
            ? 'bottom'
            : 'middle';

    const x = horizontal === 'left'
        ? bounds.x
        : horizontal === 'right'
            ? bounds.x + bounds.width
            : bounds.x + bounds.width / 2;
    const y = vertical === 'top'
        ? bounds.y
        : vertical === 'bottom'
            ? bounds.y + bounds.height
            : bounds.y + bounds.height / 2;

    return { x, y };
}

function positionTopLevelGroup(group, context) {
    const region = group.region ?? 'bottom';
    const anchorKey = group.anchor ?? 'center';
    const targetAnchor = context.metrics?.scaledAnchors?.[region]?.[anchorKey];

    if (!targetAnchor) {
        return null;
    }

    const localAnchor = getBoundsAnchorPoint(group.bounds, anchorKey);
    const baseUnit = getTextBaseUnit(context.metrics);
    const offsetX = baseUnit * (group.offsetXScale ?? 0);
    const offsetY = baseUnit * (group.offsetYScale ?? 0);

    return {
        ...group,
        x: targetAnchor.x - localAnchor.x + offsetX,
        y: targetAnchor.y - localAnchor.y + offsetY,
    };
}

export async function layoutTextModel(ctx, textModel, context = {}) {
    const groups = normalizeTextModel(textModel);
    const laidOutGroups = [];

    for (const group of groups) {
        const laidOutGroup = await layoutGroup(ctx, group, DEFAULT_TEXT_STYLE, context, 0);
        const positionedGroup = laidOutGroup ? positionTopLevelGroup(laidOutGroup, context) : null;

        if (positionedGroup) {
            laidOutGroups.push(positionedGroup);
        }
    }

    return laidOutGroups;
}
