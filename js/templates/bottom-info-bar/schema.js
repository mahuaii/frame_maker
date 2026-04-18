import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createAppearanceThemes } from '../../core/templates/registry.js';
import { buildFontSelectField, buildFrameSideFields } from '../shared.js';

export const bottomInfoBarAppearanceThemes = createAppearanceThemes({}, {
    white: {
        label: '白色',
        colors: {
            barBackground: '#FFFFFF',
            textPrimary: '#111111',
            separator: '#9CA3AF',
        },
    },
    black: {
        label: '黑色',
        colors: {
            barBackground: '#111111',
            textPrimary: '#F8FAFC',
            separator: '#475569',
        },
    },
});

export const bottomInfoBarFrame = {
    sides: {
        top: 0,
        right: 0,
        bottom: 9.5,
        left: 0,
    },
    font: {
        basis: 'height',
        size: 2.8,
        min: 12,
    },
};

export const bottomInfoBarTemplateFields = [
    buildAppearanceField(bottomInfoBarAppearanceThemes),
    ...buildFrameSideFields(bottomInfoBarFrame, ['bottom']),
    buildFontSelectField({
        key: 'leftFontId',
        label: '左侧字体',
        defaultValue: 'systemSans',
    }),
    buildFontSelectField({
        key: 'rightFontId',
        label: '右侧字体',
        defaultValue: 'systemSans',
    }),
];

export const bottomInfoBarTemplateSchema = {
    id: 'bottom-info-bar',
    label: '底部信息栏',
    backgroundColor: '#000000',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: bottomInfoBarAppearanceThemes,
    frame: bottomInfoBarFrame,
    textGroups: [],
    defaultConfig: buildDefaultConfig(bottomInfoBarTemplateFields),
    fields: bottomInfoBarTemplateFields,
};
