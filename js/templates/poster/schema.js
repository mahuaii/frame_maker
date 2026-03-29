import { buildDefaultConfig } from '../../core/templates/fields.js';
import { defaultSizing, fontFieldOptions } from '../shared.js';

export const posterTemplateFields = [
    {
        key: 'title',
        label: '标题',
        type: 'textarea',
        rows: 3,
        defaultValue: 'Night train, soft rain, one long sentence.',
    },
    {
        key: 'subtitle',
        label: '副标题',
        type: 'text',
        defaultValue: 'Write what the image should feel like.',
    },
    {
        key: 'alignment',
        label: '对齐',
        type: 'select',
        defaultValue: 'left',
        options: [
            { value: 'left', label: '左对齐' },
            { value: 'center', label: '居中' },
        ],
    },
    {
        key: 'titleFontId',
        label: '标题字体',
        type: 'select',
        defaultValue: 'angieSansStd',
        options: fontFieldOptions,
    },
    {
        key: 'accentColor',
        label: '强调色',
        type: 'color',
        defaultValue: '#ff6b35',
    },
    {
        key: 'showAccentLine',
        label: '强调线',
        type: 'toggle',
        defaultValue: true,
    },
    {
        key: 'titleScale',
        label: '标题倍率',
        type: 'number',
        min: 0.8,
        max: 2.4,
        step: 0.1,
        defaultValue: 1.35,
    },
];

export const posterTemplateSchema = {
    id: 'poster',
    label: '文本海报',
    backgroundColor: '#f7f3ec',
    ...defaultSizing,
    barHeightRatio: 0.18,
    fontSizeRatio: 0.03,
    defaultConfig: buildDefaultConfig(posterTemplateFields),
    fields: posterTemplateFields,
};
