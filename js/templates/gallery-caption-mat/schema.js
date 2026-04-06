import { buildDefaultConfig } from '../../core/templates/fields.js';
import { buildAppearanceField } from '../../core/templates/appearance.js';
import { buildTemplateLayoutMetrics } from '../layout-metrics.js';
import { fontFieldOptions } from '../shared.js';

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

export const galleryCaptionMatTemplateFields = [
    buildAppearanceField(galleryCaptionMatAppearanceThemes),
    {
        key: 'title',
        label: '主标题',
        type: 'text',
        defaultValue: '若草山 / 奈良県',
    },
    {
        key: 'subtitle',
        label: '副标题',
        type: 'text',
        defaultValue: 'NIKON Z6 III',
    },
    {
        key: 'showSubtitle',
        label: '显示副标题',
        type: 'toggle',
        defaultValue: true,
    },
    {
        key: 'titleFontId',
        label: '主标题字体',
        type: 'select',
        defaultValue: 'miSans',
        options: fontFieldOptions,
    },
    {
        key: 'subtitleFontId',
        label: '副标题字体',
        type: 'select',
        defaultValue: 'angieSansStd',
        options: fontFieldOptions,
    },
];

export function calculateGalleryCaptionMatMetrics({ image, template, scale = 1 }) {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const squareSide = Math.round(imageWidth * (template.squareSideToPhotoWidthRatio ?? 1.146));
    const baseFontSize = Math.max(Math.round(squareSide * (template.fontSizeRatio ?? 0.026)), template.minFontSize ?? 12);
    const borderWidth = Math.max(squareSide * 0.0022, 1);
    const outerFrameX = Math.round((squareSide - imageWidth) / 2);
    const outerFrameY = Math.round((squareSide - imageHeight) / 2);
    const photoAreaX = Math.round(outerFrameX + borderWidth);
    const photoAreaY = Math.round(outerFrameY + borderWidth);
    const photoAreaWidth = Math.max(Math.round(imageWidth - borderWidth * 2), 1);
    const photoAreaHeight = Math.max(Math.round(imageHeight - borderWidth * 2), 1);
    return buildTemplateLayoutMetrics({
        imageWidth,
        imageHeight,
        fullWidth: squareSide,
        fullHeight: squareSide,
        photoArea: {
            x: photoAreaX,
            y: photoAreaY,
            width: photoAreaWidth,
            height: photoAreaHeight,
        },
        fontSize: baseFontSize,
        scale,
    });
}

export const galleryCaptionMatTemplateSchema = {
    id: 'gallery-caption-mat',
    label: '留白标题卡',
    backgroundColor: '#FFFFFF',
    appearanceFieldKey: 'colorScheme',
    appearanceDefaultKey: 'white',
    appearanceThemes: galleryCaptionMatAppearanceThemes,
    squareSideToPhotoWidthRatio: 1.155,
    fontSizeRatio: 0.026,
    minFontSize: 12,
    defaultConfig: buildDefaultConfig(galleryCaptionMatTemplateFields),
    fields: galleryCaptionMatTemplateFields,
};
