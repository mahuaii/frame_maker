import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createAppearanceThemes } from '../../core/templates/registry.js';
import { sharedAppearanceThemes } from '../appearance-presets.js';
import { defaultSizing, defaultTextStyleDefaults, infoFieldDefinitions } from '../shared.js';

export const classicFrameAppearanceThemes = createAppearanceThemes(sharedAppearanceThemes, {
    blur: {
        canvasBackground: {
            type: 'edgeExtendBlur',
            color: '#2B2F37',
            blur: 110,
            ambientBlur: 180,
            ambientOpacity: 0.62,
            extendedOpacity: 0.64,
            saturate: 1.02,
            brightness: 0.7,
            contrast: 1.42,
            overlayColor: '#0E1117',
            overlayOpacity: 0.58,
            sourceBandRatio: 0.055,
        },
        barBackground: {
            type: 'edgeExtendBlur',
            color: '#2B2F37',
            blur: 110,
            ambientBlur: 180,
            ambientOpacity: 0.62,
            extendedOpacity: 0.64,
            saturate: 1.02,
            brightness: 0.7,
            contrast: 1.42,
            overlayColor: '#0E1117',
            overlayOpacity: 0.58,
            sourceBandRatio: 0.055,
        },
    },
    white: {
        colors: {
            textPrimary: '#000000',
        },
    },
    black: {
        colors: {
            textPrimary: '#FFFFFF',
        },
    },
});

export const classicFrameTemplateFields = [
    buildAppearanceField(classicFrameAppearanceThemes),
    ...infoFieldDefinitions,
];

export const classicFrameTemplateSchema = {
    id: 'classic-frame',
    label: '经典相框',
    backgroundColor: '#FFFFFF',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: classicFrameAppearanceThemes,
    ...defaultSizing,
    defaultConfig: buildDefaultConfig(classicFrameTemplateFields),
    fields: classicFrameTemplateFields,
    textStyleDefaults: {
        ...defaultTextStyleDefaults,
    },
};
