import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { buildTemplateLayoutMetrics } from '../layout-metrics.js';

export const simpleMatAppearanceThemes = {
    white: {
        label: '白色',
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
    },
    black: {
        label: '黑色',
        canvasBackground: {
            type: 'solid',
            color: '#030303',
        },
    },
    edgeBlur: {
        label: '边缘氛围',
        canvasBackground: {
            type: 'edgeExtendBlur',
            color: '#2B2F37',
            blur: 200,
            ambientBlur: 250,
            ambientOpacity: 0.62,
            extendedOpacity: 0.64,
            saturate: 1.02,
            brightness: 0.9,
            contrast: 1.4,
            overlayColor: '#191919',
            overlayOpacity: 0.54,
            sourceBandRatio: 0.1,
        },
    },
};

export const simpleMatTemplateFields = [
    buildAppearanceField(simpleMatAppearanceThemes),
];

export const simpleMatTemplateSchema = {
    id: 'simple-mat',
    label: '极简留边',
    backgroundColor: '#FFFFFF',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'black',
    appearanceThemes: simpleMatAppearanceThemes,
    barSizeBasis: 'height',
    fontSizeBasis: 'height',
    barHeightRatio: 0,
    fontSizeRatio: 0,
    minFontSize: 12,
    canvasWidthRatio: 1.05,
    canvasHeightRatio: 1.1,
    photoAreaXRatio: 0.025 / 1.05,
    photoAreaYRatio: 0.025 / 1.1,
    photoAreaWidthRatio: 1 / 1.05,
    photoAreaHeightRatio: 1 / 1.1,
    defaultConfig: buildDefaultConfig(simpleMatTemplateFields),
    fields: simpleMatTemplateFields,
};

export function calculateSimpleMatMetrics({ image, template, scale = 1 }) {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const fullWidth = Math.round(imageWidth * (template.canvasWidthRatio ?? 1.05));
    const fullHeight = Math.round(imageHeight * (template.canvasHeightRatio ?? 1.1));
    const photoArea = {
        x: Math.round(fullWidth * (template.photoAreaXRatio ?? (0.025 / 1.05))),
        y: Math.round(fullHeight * (template.photoAreaYRatio ?? (0.025 / 1.1))),
        width: Math.round(fullWidth * (template.photoAreaWidthRatio ?? (1 / 1.05))),
        height: Math.round(fullHeight * (template.photoAreaHeightRatio ?? (1 / 1.1))),
    };
    const fontSize = Math.max(Math.round(fullHeight * (template.fontSizeRatio ?? 0)), template.minFontSize ?? 12);

    return buildTemplateLayoutMetrics({
        imageWidth,
        imageHeight,
        fullWidth,
        fullHeight,
        photoArea,
        fontSize,
        scale,
    });
}
