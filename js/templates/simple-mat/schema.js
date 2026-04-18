import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { buildFrameSideFields, buildWhiteAppearanceToggleField, defaultFrameFont } from '../shared.js';

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

export const simpleMatFrame = {
    sides: {
        top: 2.5,
        right: 2.5,
        bottom: 7.5,
        left: 2.5,
    },
    font: defaultFrameFont,
};

export const simpleMatTemplateFields = [
    buildAppearanceField(simpleMatAppearanceThemes),
    ...buildFrameSideFields(simpleMatFrame, ['top', 'bottom', 'horizontalSides']),
    buildWhiteAppearanceToggleField({
        key: 'showThinBorder',
        label: '内边框',
        defaultValue: false,
    }),
];

export const simpleMatTemplateSchema = {
    id: 'simple-mat',
    backgroundColor: '#FFFFFF',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'black',
    appearanceThemes: simpleMatAppearanceThemes,
    frame: simpleMatFrame,
    textGroups: [],
    defaultConfig: buildDefaultConfig(simpleMatTemplateFields),
    fields: simpleMatTemplateFields,
};
