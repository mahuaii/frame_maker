import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createAppearanceThemes } from '../../core/templates/registry.js';

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

export const bottomInfoBarTemplateFields = [
    buildAppearanceField(bottomInfoBarAppearanceThemes),
];

export const bottomInfoBarTemplateSchema = {
    id: 'bottom-info-bar',
    label: '底部信息栏',
    backgroundColor: '#000000',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: bottomInfoBarAppearanceThemes,
    barSizeBasis: 'height',
    fontSizeBasis: 'height',
    barHeightRatio: 0.095,
    fontSizeRatio: 0.028,
    minFontSize: 12,
    defaultConfig: buildDefaultConfig(bottomInfoBarTemplateFields),
    fields: bottomInfoBarTemplateFields,
};
