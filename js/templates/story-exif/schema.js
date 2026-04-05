import { buildDefaultConfig } from '../../core/templates/fields.js';
import { defaultSizing, fontFieldOptions } from '../shared.js';

export const storyExifTemplateFields = [
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
        defaultValue: 'Title and EXIF can coexist without placeholders.',
    },
    {
        key: 'titleFontId',
        label: '标题字体',
        type: 'select',
        defaultValue: 'angieSansStd',
        options: fontFieldOptions,
    },
    {
        key: 'metaFontId',
        label: '信息字体',
        type: 'select',
        defaultValue: 'systemSans',
        options: fontFieldOptions,
    },
    {
        key: 'showLens',
        label: '镜头',
        type: 'toggle',
        defaultValue: true,
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
    ...defaultSizing,
    barHeightRatio: 0.14,
    fontSizeRatio: 0.028,
    defaultConfig: buildDefaultConfig(storyExifTemplateFields),
    fields: storyExifTemplateFields,
};
