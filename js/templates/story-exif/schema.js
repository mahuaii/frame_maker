import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createSolidAppearanceThemes } from '../appearance-presets.js';
import { buildFrameLayoutFields } from '../shared.js';

export const storyExifAppearanceThemes = createSolidAppearanceThemes({
    white: {
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
        colors: {
            title: '#F8FAFC',
            subtitle: '#CBD5E1',
            metaPrimary: '#E2E8F0',
            metaSecondary: '#94A3B8',
            metaFallback: '#94A3B8',
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
                color: '#111827',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'story-title',
                    type: 'text',
                    label: '标题',
                    content: 'A small headline for the frame',
                    emptyBehavior: 'hide',
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
                    emptyBehavior: 'hide',
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
                color: '#1F2937',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'story-meta-primary',
                    type: 'text',
                    label: '主参数',
                    content: '{{metaPrimary}}',
                    fallbackContent: 'EXIF unavailable',
                    emptyBehavior: 'fallback',
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
                    emptyBehavior: 'hide',
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
