import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { buildFontSelectField, buildFrameSideFields } from '../shared.js';

export const storyExifAppearanceThemes = {
    white: {
        label: '白色',
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
        colors: {
            title: '#111827',
            subtitle: '#6B7280',
            metaPrimary: '#1F2937',
            metaSecondary: '#6B7280',
            metaFallback: '#9CA3AF',
        },
    },
    black: {
        label: '黑色',
        canvasBackground: {
            type: 'solid',
            color: '#111111',
        },
        colors: {
            title: '#F8FAFC',
            subtitle: '#CBD5E1',
            metaPrimary: '#E2E8F0',
            metaSecondary: '#94A3B8',
            metaFallback: '#94A3B8',
        },
    },
};

export const storyExifFrame = {
    sides: {
        top: 0,
        right: 0,
        bottom: 14,
        left: 0,
    },
    font: {
        basis: 'height',
        size: 2.8,
        min: 12,
    },
};

export const storyExifTemplateFields = [
    buildAppearanceField(storyExifAppearanceThemes),
    ...buildFrameSideFields(storyExifFrame, ['bottom']),
    {
        key: 'title',
        label: '标题',
        type: 'text',
        defaultValue: 'A small headline for the frame',
    },
    {
        key: 'subtitle',
        label: '副标题',
        type: 'text',
        defaultValue: 'Description goes here',
    },
    {
        key: 'showSubtitle',
        label: '副标题',
        type: 'toggle',
        defaultValue: true,
    },
    buildFontSelectField({
        key: 'titleFontId',
        label: '标题字体',
        defaultValue: 'angieSansStd',
    }),
    buildFontSelectField({
        key: 'metaFontId',
        label: '信息字体',
        defaultValue: 'systemSans',
    }),
    {
        key: 'showLens',
        label: '镜头',
        type: 'toggle',
        defaultValue: false,
    },
    {
        key: 'metaScale',
        label: '信息倍率',
        type: 'number',
        min: 0.8,
        max: 1.8,
        step: 0.1,
        defaultValue: 1,
    },
    {
        key: 'fallbackNote',
        label: '无 EXIF 文案',
        type: 'text',
        defaultValue: 'EXIF unavailable',
    },
];

export const storyExifTemplateSchema = {
    id: 'story-exif',
    label: '标题 + EXIF',
    backgroundColor: '#111111',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'black',
    appearanceThemes: storyExifAppearanceThemes,
    frame: storyExifFrame,
    textGroups: [
        {
            region: 'bottom',
            anchor: 'middle-left',
            maxWidthRatio: 0.58,
            gapRatio: 0.18,
            texts: [
                {
                    configPath: 'title',
                    fontIdConfigKey: 'titleFontId',
                    fontWeight: 600,
                    fontSizeRatio: 1.28,
                    colorKey: 'title',
                    minFontSize: 14,
                },
                {
                    configPath: 'subtitle',
                    whenConfig: 'showSubtitle',
                    fontIdConfigKey: 'titleFontId',
                    fontSizeRatio: 0.82,
                    colorKey: 'subtitle',
                    minFontSize: 11,
                },
            ],
        },
        {
            region: 'bottom',
            anchor: 'middle-right',
            textAlign: 'right',
            maxWidthRatio: 0.38,
            gapRatio: 0.18,
            texts: [
                {
                    dataPath: 'primaryMetaText',
                    fontIdConfigKey: 'metaFontId',
                    fontSizeRatioConfigKey: 'metaScale',
                    fontSizeRatio: 0.88,
                    colorKeyDataPath: 'primaryMetaColorKey',
                    minFontSize: 11,
                },
                {
                    dataPath: 'secondaryMetaText',
                    whenData: 'hasSecondaryMeta',
                    fontIdConfigKey: 'metaFontId',
                    fontSizeRatioConfigKey: 'metaScale',
                    fontSizeRatio: 0.88,
                    colorKey: 'metaSecondary',
                    minFontSize: 11,
                },
            ],
        },
    ],
    defaultConfig: buildDefaultConfig(storyExifTemplateFields),
    fields: storyExifTemplateFields,
};
