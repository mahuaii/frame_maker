import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createAppearanceThemes } from '../../core/templates/registry.js';
import { sharedAppearanceThemes } from '../appearance-presets.js';
import { defaultSizing, defaultTextStyleDefaults, infoFieldDefinitions } from '../shared.js';

export const classicFrameAppearanceThemes = createAppearanceThemes(sharedAppearanceThemes, {
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
