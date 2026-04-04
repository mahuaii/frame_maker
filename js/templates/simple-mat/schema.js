import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';

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
