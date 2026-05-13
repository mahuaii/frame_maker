import { buildDefaultConfig } from '../../core/templates/fields.ts';
import { buildAppearanceField } from '../../core/templates/appearance.ts';
import { createSolidAppearanceThemes } from '../appearance-presets.ts';
import { buildFrameLayoutFields } from '../shared.ts';

export const galleryCaptionMatAppearanceThemes = createSolidAppearanceThemes({
    white: {
        label: '白色',
        colors: {
            text: {
                title: '#000000E5',
                subtitle: '#000000DD',
            },
        },
    },
    black: {
        label: '黑色',
        colors: {
            text: {
                title: '#F5F5F5',
                subtitle: '#FFFFFF',
            },
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
    assets: {
        thumbnail: 'assets/thumbnail.jpg',
    },
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
                color: '#000000E5',
                letterSpacingScale: 0,
            },
            items: [
                {
                    id: 'caption-title',
                    type: 'text',
                    label: '主标题',
                    content: 'Sample Location / City',
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
    overlays: [
        {
            type: 'photoBorder',
            enabledConfigKey: 'showThinBorder',
            colorToken: 'photoBorder',
            fallbackColor: '#000000',
            widthRatio: 0.0022,
            shape: 'beveled',
        },
    ],
    defaultConfig: buildDefaultConfig(galleryCaptionMatTemplateFields),
    fields: galleryCaptionMatTemplateFields,
};
