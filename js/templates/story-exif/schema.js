import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createSolidAppearanceThemes } from '../appearance-presets.js';
import { buildFrameLayoutFields } from '../shared.js';

export const storyExifAppearanceThemes = createSolidAppearanceThemes({
    white: {
        colors: {
            text: {
                title: '#000000E4',
                subtitle: '#0000008B',
                metaPrimary: '#000000D5',
                metaSecondary: '#0000008B',
            },
        },
    },
    black: {
        label: '黑色',
        colors: {
            text: {
                title: '#F8FAFC',
                subtitle: '#CBD5E1',
                metaPrimary: '#E2E8F0',
                metaSecondary: '#94A3B8',
            },
        },
    },
});

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
    ...buildFrameLayoutFields(storyExifFrame),
];

export const storyExifTemplateSchema = {
    id: 'story-exif',
    backgroundColor: '#121212',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'black',
    appearanceThemes: storyExifAppearanceThemes,
    frame: storyExifFrame,
    assets: {
        thumbnail: 'assets/thumbnail.jpg',
    },
    textGroups: [
        {
            id: 'story-title-group',
            type: 'group',
            label: '标题组',
            region: 'bottom',
            anchor: 'middle-left',
            direction: 'vertical',
            align: 'start',
            gapScale: 0.2,
            offsetXScale: 0,
            offsetYScale: 0,
            visible: true,
            style: {
                fontId: 'angieSansStd',
                fontScale: 1,
                fontWeight: 400,
                fontStyle: 'normal',
                colorToken: 'title',
                color: '#000000E4',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'story-title',
                    type: 'text',
                    label: '标题',
                    content: 'A small headline for the frame',
                    visible: true,
                    style: {
                        fontId: 'angieSansStd',
                        fontScale: 1.28,
                        fontWeight: 600,
                        colorToken: 'title',
                    },
                },
                {
                    id: 'story-subtitle',
                    type: 'text',
                    label: '副标题',
                    content: 'Description goes here',
                    visible: true,
                    style: {
                        fontId: 'angieSansStd',
                        fontScale: 0.82,
                        fontWeight: 400,
                        colorToken: 'subtitle',
                    },
                },
            ],
        },
        {
            id: 'story-meta-group',
            type: 'group',
            label: '拍摄信息组',
            region: 'bottom',
            anchor: 'middle-right',
            direction: 'vertical',
            align: 'end',
            gapScale: 0.2,
            offsetXScale: 0,
            offsetYScale: 0,
            visible: true,
            style: {
                fontId: 'systemSans',
                fontScale: 0.88,
                fontWeight: 400,
                fontStyle: 'normal',
                colorToken: 'metaPrimary',
                color: '#000000D5',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'story-meta-primary',
                    type: 'text',
                    label: '主参数',
                    content: '{{metaPrimary}}',
                    fallbackContent: 'EXIF unavailable',
                    visible: true,
                    style: {
                        colorToken: 'metaPrimary',
                    },
                },
                {
                    id: 'story-meta-secondary',
                    type: 'text',
                    label: '次参数',
                    content: '{{metaSecondary}}',
                    hideWhenEmptyToken: true,
                    visible: true,
                    style: {
                        colorToken: 'metaSecondary',
                    },
                },
            ],
        },
    ],
    defaultConfig: buildDefaultConfig(storyExifTemplateFields),
    fields: storyExifTemplateFields,
};
