import { ORIGINAL_FRAME_ASPECT_RATIO, parseFrameAspectRatio } from '../templates/frame-layout.ts';
import { resolveTemplateConfig } from '../templates/registry.js';

const FRAME_SIDE_KEYS = ['top', 'right', 'bottom', 'left'];
const TEXT_REGION_KEYS = ['top', 'right', 'bottom', 'left', 'center'];
const FRAME_SIDE_FIELD_KEYS = {
    top: 'frameTop',
    right: 'frameRight',
    bottom: 'frameBottom',
    left: 'frameLeft',
};
const ANCHOR_COLUMNS = ['left', 'center', 'right'];
const ANCHOR_ROWS = ['top', 'middle', 'bottom'];

function getBasisSize(imageWidth, imageHeight, basis) {
    switch (basis) {
        case 'width':
            return imageWidth;
        case 'height':
            return imageHeight;
        case 'shorterSide':
            return Math.min(imageWidth, imageHeight);
        case 'longerSide':
            return Math.max(imageWidth, imageHeight);
        case 'area':
            return Math.sqrt(imageWidth * imageHeight);
        default:
            return imageHeight;
    }
}

function normalizeNonNegativeNumber(value, fallbackValue = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallbackValue;
}

function normalizeFrameSides(template, config = {}) {
    const templateSides = template?.frame?.sides ?? {};
    const sides = FRAME_SIDE_KEYS.reduce((result, side) => {
        result[side] = normalizeNonNegativeNumber(templateSides[side], 0);
        return result;
    }, {});

    FRAME_SIDE_KEYS.forEach((side) => {
        const fieldKey = FRAME_SIDE_FIELD_KEYS[side];
        const value = config[fieldKey];
        if (Number.isFinite(Number(value))) {
            sides[side] = normalizeNonNegativeNumber(value, 0);
        }
    });

    return sides;
}

function scaleRect(rect, scale) {
    return {
        x: rect.x * scale,
        y: rect.y * scale,
        width: rect.width * scale,
        height: rect.height * scale,
    };
}

function scaleInsets(insets, scale) {
    return {
        top: insets.top * scale,
        right: insets.right * scale,
        bottom: insets.bottom * scale,
        left: insets.left * scale,
    };
}

function insetRegion(region, insets) {
    return {
        x: region.x + insets.left,
        y: region.y + insets.top,
        width: Math.max(region.width - insets.left - insets.right, 0),
        height: Math.max(region.height - insets.top - insets.bottom, 0),
    };
}

function getFrameMarginConfig(template) {
    return {
        edgeRatio: normalizeNonNegativeNumber(template?.frame?.margin?.edgeRatio, 0.015),
        crossRatio: normalizeNonNegativeNumber(template?.frame?.margin?.crossRatio, 0),
        min: normalizeNonNegativeNumber(template?.frame?.margin?.min, 12),
    };
}

function clampInset(value, maxValue) {
    return Math.min(Math.max(value, 0), Math.max(maxValue, 0));
}

function buildTextInsets({ imageWidth, imageHeight, textRegions, template }) {
    const margin = getFrameMarginConfig(template);
    const edgeBasis = Math.min(imageWidth, imageHeight);
    const edgeInset = Math.max(edgeBasis * margin.edgeRatio, margin.min);

    return {
        top: {
            top: clampInset(edgeInset, textRegions.top.height / 2),
            right: 0,
            bottom: clampInset(edgeInset, textRegions.top.height / 2),
            left: 0,
        },
        right: {
            top: 0,
            right: clampInset(edgeInset, textRegions.right.width / 2),
            bottom: 0,
            left: clampInset(edgeInset, textRegions.right.width / 2),
        },
        bottom: {
            top: clampInset(edgeInset, textRegions.bottom.height / 2),
            right: 0,
            bottom: clampInset(edgeInset, textRegions.bottom.height / 2),
            left: 0,
        },
        left: {
            top: 0,
            right: clampInset(edgeInset, textRegions.left.width / 2),
            bottom: 0,
            left: clampInset(edgeInset, textRegions.left.width / 2),
        },
        center: {
            top: clampInset(edgeInset, textRegions.center.height / 2),
            right: clampInset(edgeInset, textRegions.center.width / 2),
            bottom: clampInset(edgeInset, textRegions.center.height / 2),
            left: clampInset(edgeInset, textRegions.center.width / 2),
        },
    };
}

function buildRegionAnchors(contentRect) {
    const xPositions = {
        left: contentRect.x,
        center: contentRect.x + contentRect.width / 2,
        right: contentRect.x + contentRect.width,
    };
    const yPositions = {
        top: contentRect.y,
        middle: contentRect.y + contentRect.height / 2,
        bottom: contentRect.y + contentRect.height,
    };

    return ANCHOR_ROWS.reduce((anchors, row) => {
        ANCHOR_COLUMNS.forEach((column) => {
            const key = row === 'middle' && column === 'center' ? 'center' : `${row}-${column}`;
            anchors[key] = {
                x: xPositions[column],
                y: yPositions[row],
            };
        });
        return anchors;
    }, {});
}

function buildTextAnchors(contentRegions) {
    return TEXT_REGION_KEYS.reduce((anchors, region) => {
        anchors[region] = buildRegionAnchors(contentRegions[region]);
        return anchors;
    }, {});
}

function scalePoint(point, scale) {
    return {
        x: point.x * scale,
        y: point.y * scale,
    };
}

function scaleAnchors(anchors, scale) {
    return TEXT_REGION_KEYS.reduce((scaled, region) => {
        scaled[region] = Object.entries(anchors[region]).reduce((result, [key, point]) => {
            result[key] = scalePoint(point, scale);
            return result;
        }, {});
        return scaled;
    }, {});
}

function getFrameFontSize(imageWidth, imageHeight, template) {
    const font = template?.frame?.font ?? {};
    const basis = getBasisSize(imageWidth, imageHeight, font.basis ?? 'height');
    const sizePercent = normalizeNonNegativeNumber(font.size, 2.8);
    const min = normalizeNonNegativeNumber(font.min, 12);
    return Math.max(Math.round(basis * (sizePercent / 100)), min);
}

function buildDefaultFourSideFrame({ imageWidth, imageHeight, template, config }) {
    const sidesPercent = normalizeFrameSides(template, config);
    const sidesPx = {
        top: Math.round(imageHeight * (sidesPercent.top / 100)),
        right: Math.round(imageWidth * (sidesPercent.right / 100)),
        bottom: Math.round(imageHeight * (sidesPercent.bottom / 100)),
        left: Math.round(imageWidth * (sidesPercent.left / 100)),
    };

    return {
        sidesPercent,
        sidesPx,
        fullWidth: sidesPx.left + imageWidth + sidesPx.right,
        fullHeight: sidesPx.top + imageHeight + sidesPx.bottom,
    };
}

function splitEvenly(total) {
    const first = Math.round(total / 2);
    return [first, Math.round(total - first)];
}

function getControlledBorderAxis(photoRatio, targetRatio) {
    if (targetRatio > photoRatio) {
        return 'vertical';
    }

    return 'horizontal';
}

function resolveFrameAspectRatio(config, photoRatio) {
    return config.frameAspectRatio === ORIGINAL_FRAME_ASPECT_RATIO
        ? photoRatio
        : parseFrameAspectRatio(config.frameAspectRatio);
}

function buildFixedAspectRatioFrame({ imageWidth, imageHeight, config }) {
    const photoRatio = imageWidth / imageHeight;
    const aspectRatio = resolveFrameAspectRatio(config, photoRatio);
    const borderWidth = normalizeNonNegativeNumber(config.frameBorderWidth, 0);
    const borderTotal = Math.min(imageWidth, imageHeight) * (borderWidth / 100);
    const controlledAxis = getControlledBorderAxis(photoRatio, aspectRatio);
    let horizontalTotal;
    let verticalTotal;

    if (controlledAxis === 'vertical') {
        verticalTotal = borderTotal;
        horizontalTotal = (imageHeight + verticalTotal) * aspectRatio - imageWidth;
    } else {
        horizontalTotal = borderTotal;
        verticalTotal = (imageWidth + horizontalTotal) / aspectRatio - imageHeight;
    }

    const [top, bottom] = splitEvenly(verticalTotal);
    const [left, right] = splitEvenly(horizontalTotal);
    const sidesPx = { top, right, bottom, left };
    const sidesPercent = {
        top: imageHeight > 0 ? (sidesPx.top / imageHeight) * 100 : 0,
        right: imageWidth > 0 ? (sidesPx.right / imageWidth) * 100 : 0,
        bottom: imageHeight > 0 ? (sidesPx.bottom / imageHeight) * 100 : 0,
        left: imageWidth > 0 ? (sidesPx.left / imageWidth) * 100 : 0,
    };

    return {
        sidesPercent,
        sidesPx,
        fullWidth: sidesPx.left + imageWidth + sidesPx.right,
        fullHeight: sidesPx.top + imageHeight + sidesPx.bottom,
    };
}

export function calculateFrameMetrics(image, template, scale = 1, rawConfig = {}) {
    const config = resolveTemplateConfig(template, rawConfig);
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const photoRatio = imageWidth / imageHeight;
    const frameGeometry = resolveFrameAspectRatio(config, photoRatio)
        ? buildFixedAspectRatioFrame({ imageWidth, imageHeight, config })
        : buildDefaultFourSideFrame({ imageWidth, imageHeight, template, config });
    const { sidesPercent, sidesPx, fullWidth, fullHeight } = frameGeometry;
    const photoArea = {
        x: sidesPx.left,
        y: sidesPx.top,
        width: imageWidth,
        height: imageHeight,
    };
    const textRegions = {
        top: {
            x: sidesPx.left,
            y: 0,
            width: imageWidth,
            height: sidesPx.top,
        },
        right: {
            x: sidesPx.left + imageWidth,
            y: sidesPx.top,
            width: sidesPx.right,
            height: imageHeight,
        },
        bottom: {
            x: sidesPx.left,
            y: sidesPx.top + imageHeight,
            width: imageWidth,
            height: sidesPx.bottom,
        },
        left: {
            x: 0,
            y: sidesPx.top,
            width: sidesPx.left,
            height: imageHeight,
        },
        center: {
            ...photoArea,
        },
    };
    const textInsets = buildTextInsets({ imageWidth, imageHeight, textRegions, template });
    const textContentRegions = TEXT_REGION_KEYS.reduce((regions, region) => {
        regions[region] = insetRegion(textRegions[region], textInsets[region]);
        return regions;
    }, {});
    const anchors = buildTextAnchors(textContentRegions);
    const fontSize = getFrameFontSize(imageWidth, imageHeight, template);

    return {
        imageWidth,
        imageHeight,
        fullWidth,
        fullHeight,
        canvasSize: {
            width: fullWidth,
            height: fullHeight,
        },
        sidesPercent,
        sidesPx,
        fontSize,
        photoArea,
        textRegions,
        textInsets,
        textContentRegions,
        anchors,
        scaledPhotoArea: scaleRect(photoArea, scale),
        scaledSidesPx: {
            top: sidesPx.top * scale,
            right: sidesPx.right * scale,
            bottom: sidesPx.bottom * scale,
            left: sidesPx.left * scale,
        },
        scaledTextRegions: TEXT_REGION_KEYS.reduce((regions, region) => {
            regions[region] = scaleRect(textRegions[region], scale);
            return regions;
        }, {}),
        scaledTextInsets: TEXT_REGION_KEYS.reduce((insets, region) => {
            insets[region] = scaleInsets(textInsets[region], scale);
            return insets;
        }, {}),
        scaledTextContentRegions: TEXT_REGION_KEYS.reduce((regions, region) => {
            regions[region] = scaleRect(textContentRegions[region], scale);
            return regions;
        }, {}),
        scaledAnchors: scaleAnchors(anchors, scale),
        scaledFontSize: fontSize * scale,
    };
}

export function calculatePreviewScale(image, template, containerWidth, containerHeight, padding = 0.9, rawConfig = {}) {
    const { fullWidth, fullHeight } = calculateFrameMetrics(image, template, 1, rawConfig);

    const maxWidth = containerWidth * padding;
    const maxHeight = containerHeight * padding;

    const scaleX = maxWidth / fullWidth;
    const scaleY = maxHeight / fullHeight;

    return Math.min(scaleX, scaleY, 1);
}
