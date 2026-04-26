import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { createSolidAppearanceThemes } from '../appearance-presets.js';
import { buildFrameLayoutFields } from '../shared.js';

export const galleryCaptionMatAppearanceThemes = createSolidAppearanceThemes({
    white: {
        label: '白底',
        colors: {
            title: '#1A1A1A',
            subtitle: '#222222',
        },
    },
    black: {
        label: '黑底',
        colors: {
            title: '#F5F5F5',
            subtitle: '#FFFFFF',
        },
    },
});

export const galleryCaptionMatFrame = {
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
    ...buildFrameLayoutFields(galleryCaptionMatFrame, {
        aspectRatio: '1:1',
        borderWidth: 24,
    }),
    {
        key: 'showThinBorder',
        label: '内边框',
        type: 'toggle',
        defaultValue: true,
    },
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
            id: 'caption',
            type: 'group',
            label: '标题组',
            region: 'bottom',
            anchor: 'center',
            direction: 'vertical',
            align: 'center',
            gapScale: 0.46,
            offsetXScale: 0,
            offsetYScale: 0,
            visible: true,
            style: {
                fontId: 'miSans',
                fontScale: 1,
                fontWeight: 300,
                fontStyle: 'normal',
                colorToken: 'title',
                color: '#1A1A1A',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'caption-title',
                    type: 'text',
                    label: '主标题',
                    content: 'Sample Location / City',
                    fallbackContent: 'Untitled',
                    emptyBehavior: 'fallback',
                    visible: true,
                    style: {
                        fontId: 'miSans',
                        fontScale: 1.05,
                        fontWeight: 300,
                        colorToken: 'title',
                    },
                },
                {
                    id: 'caption-subtitle',
                    type: 'text',
                    label: '副标题',
                    content: 'Camera Model / Notes',
                    fallbackContent: '',
                    emptyBehavior: 'hide',
                    visible: true,
                    style: {
                        fontId: 'angieSansStd',
                        fontScale: 0.6,
                        fontWeight: 400,
                        colorToken: 'subtitle',
                    },
                },
            ],
        },
    ],
    defaultConfig: buildDefaultConfig(galleryCaptionMatTemplateFields),
    fields: galleryCaptionMatTemplateFields,
};
