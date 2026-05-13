import { buildDefaultConfig } from '../../core/templates/fields.ts';
import { buildAppearanceField } from '../../core/templates/appearance.ts';
import { createSolidAppearanceThemes } from '../appearance-presets.ts';
import { buildFrameLayoutFields, buildThinBorderToggleField, defaultFrameFont } from '../shared.ts';

export const simpleMatAppearanceThemes = {
    ...createSolidAppearanceThemes(),
    edgeBlur: {
        label: '深色模糊',
        displayValue: '模糊',
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
    ...buildFrameLayoutFields(simpleMatFrame),
    buildThinBorderToggleField({
        key: 'showThinBorder',
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
    assets: {
        thumbnail: 'assets/thumbnail.jpg',
    },
    textGroups: [],
    overlays: [
        {
            type: 'photoBorder',
            enabledConfigKey: 'showThinBorder',
            colorToken: 'photoBorder',
            fallbackColor: '#000000',
            widthRatio: 0.0022,
            shape: 'beveled',
        },
    ],
    defaultConfig: buildDefaultConfig(simpleMatTemplateFields),
    fields: simpleMatTemplateFields,
};
