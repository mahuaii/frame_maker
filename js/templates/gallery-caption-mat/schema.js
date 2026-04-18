import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { buildFontSelectField } from '../shared.js';

export const galleryCaptionMatAppearanceThemes = {
    white: {
        label: '白底',
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
        colors: {
            title: '#1A1A1A',
            subtitle: '#222222',
            photoBorder: '#000000',
        },
    },
    black: {
        label: '黑底',
        canvasBackground: {
            type: 'solid',
            color: '#050505',
        },
        colors: {
            title: '#F5F5F5',
            subtitle: '#FFFFFF',
            photoBorder: '#FFFFFF',
        },
    },
};

export const galleryCaptionMatFrame = {
    fixedAspectRatio: '1:1',
    sides: {
        top: 7.75,
        right: 7.75,
        bottom: 7.75,
        left: 7.75,
    },
    font: {
        basis: 'width',
        size: 3.003,
        min: 12,
    },
};

export const galleryCaptionMatTemplateFields = [
    buildAppearanceField(galleryCaptionMatAppearanceThemes),
    {
        key: 'showThinBorder',
        label: '内边框',
        type: 'toggle',
        defaultValue: true,
    },
    {
        key: 'title',
        label: '主标题',
        type: 'text',
        defaultValue: 'Sample Location / City',
    },
    {
        key: 'subtitle',
        label: '副标题',
        type: 'text',
        defaultValue: 'Camera Model / Notes',
    },
    {
        key: 'showSubtitle',
        label: '显示副标题',
        type: 'toggle',
        defaultValue: true,
    },
    buildFontSelectField({
        key: 'titleFontId',
        label: '主标题字体',
        defaultValue: 'miSans',
    }),
    {
        key: 'titleFontWeight',
        label: '主标题字重',
        type: 'number',
        defaultValue: 300,
        hidden: true,
    },
    buildFontSelectField({
        key: 'subtitleFontId',
        label: '副标题字体',
        defaultValue: 'angieSansStd',
    }),
];

export const galleryCaptionMatTemplateSchema = {
    id: 'gallery-caption-mat',
    backgroundColor: '#FFFFFF',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: galleryCaptionMatAppearanceThemes,
    frame: galleryCaptionMatFrame,
    textGroups: [
        {
            region: 'bottom',
            anchor: 'center',
            maxWidthBasis: 'frameWidth',
            maxWidthRatio: 0.56,
            gapBasis: 'frameWidth',
            gapRatio: 0.014,
            texts: [
                {
                    configPath: 'title',
                    fallbackText: 'Untitled',
                    fontIdConfigKey: 'titleFontId',
                    fontWeightConfigKey: 'titleFontWeight',
                    fontSizeRatio: 1.05,
                    colorKey: 'title',
                    minFontSize: 12,
                },
                {
                    configPath: 'subtitle',
                    whenConfig: 'showSubtitle',
                    fontIdConfigKey: 'subtitleFontId',
                    fontSizeRatio: 0.6,
                    colorKey: 'subtitle',
                    minFontSize: 8,
                    maxWidthBasis: 'frameWidth',
                    maxWidthRatio: 0.34,
                },
            ],
        },
    ],
    defaultConfig: buildDefaultConfig(galleryCaptionMatTemplateFields),
    fields: galleryCaptionMatTemplateFields,
};
