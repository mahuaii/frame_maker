import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createSolidAppearanceThemes } from '../appearance-presets.js';
import { buildFrameLayoutFields } from '../shared.js';

export const bottomInfoBarAppearanceThemes = createSolidAppearanceThemes({
    white: {
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
        colors: {
            barBackground: '#FFFFFF',
            textPrimary: '#111111',
            separator: '#9CA3AF',
        },
    },
    black: {
        canvasBackground: {
            type: 'solid',
            color: '#111111',
        },
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
    ...buildFrameLayoutFields(bottomInfoBarFrame),
];

export const bottomInfoBarTemplateSchema = {
    id: 'bottom-info-bar',
    backgroundColor: '#121212',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: bottomInfoBarAppearanceThemes,
    frame: bottomInfoBarFrame,
    textGroups: [
        {
            id: 'bottom-info-camera',
            type: 'group',
            label: '相机信息',
            region: 'bottom',
            anchor: 'middle-left',
            direction: 'horizontal',
            align: 'center',
            gapScale: 0.4,
            offsetXScale: 0,
            offsetYScale: 0,
            visible: true,
            style: {
                fontId: 'systemSans',
                fontScale: 0.92,
                fontWeight: 700,
                fontStyle: 'normal',
                colorToken: 'textPrimary',
                color: '#111111',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'bottom-info-camera-text',
                    type: 'text',
                    label: '相机',
                    content: '{{camera}}',
                    visible: true,
                },
            ],
        },
        {
            id: 'bottom-info-meta',
            type: 'group',
            label: '参数信息',
            region: 'bottom',
            anchor: 'middle-right',
            direction: 'horizontal',
            align: 'center',
            gapScale: 0.58,
            offsetXScale: 0,
            offsetYScale: 0,
            visible: true,
            style: {
                fontId: 'systemSans',
                fontScale: 0.8,
                fontWeight: 600,
                fontStyle: 'normal',
                colorToken: 'textPrimary',
                color: '#111111',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'bottom-info-focal-length',
                    type: 'text',
                    label: '焦距',
                    content: '{{focalLength}}',
                    visible: true,
                },
                {
                    id: 'bottom-info-separator-1',
                    type: 'separator',
                    label: '分隔线',
                    lengthScale: 1.1,
                    thicknessScale: 0.06,
                    colorToken: 'separator',
                    color: '#9CA3AF',
                    visible: true,
                },
                {
                    id: 'bottom-info-aperture',
                    type: 'text',
                    label: '光圈',
                    content: '{{aperture}}',
                    visible: true,
                },
                {
                    id: 'bottom-info-separator-2',
                    type: 'separator',
                    label: '分隔线',
                    lengthScale: 1.1,
                    thicknessScale: 0.06,
                    colorToken: 'separator',
                    color: '#9CA3AF',
                    visible: true,
                },
                {
                    id: 'bottom-info-shutter',
                    type: 'text',
                    label: '快门',
                    content: '{{shutter}}',
                    visible: true,
                },
                {
                    id: 'bottom-info-separator-3',
                    type: 'separator',
                    label: '分隔线',
                    lengthScale: 1.1,
                    thicknessScale: 0.06,
                    colorToken: 'separator',
                    color: '#9CA3AF',
                    visible: true,
                },
                {
                    id: 'bottom-info-iso',
                    type: 'text',
                    label: 'ISO',
                    content: 'ISO {{iso}}',
                    visible: true,
                },
            ],
        },
    ],
    defaultConfig: buildDefaultConfig(bottomInfoBarTemplateFields),
    fields: bottomInfoBarTemplateFields,
};
