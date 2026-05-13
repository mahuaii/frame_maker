import { DEFAULT_FONT_IDS, FONT_FAMILIES, getFontFieldOptions } from '../core/fonts/index.js';
import {
    FRAME_ASPECT_RATIO_OPTIONS,
    FREE_FRAME_ASPECT_RATIO,
} from '../core/templates/frame-layout.ts';

export const defaultFrameFont = {
    basis: 'height',
    size: 2.8,
    min: 12,
};

const sideFieldDefinitions = {
    top: { key: 'frameTop' },
    right: { key: 'frameRight' },
    bottom: { key: 'frameBottom' },
    left: { key: 'frameLeft' },
};

const frameSideControlOrder = ['top', 'right', 'bottom', 'left'];

function getFrameSideDefault(frame = {}, control) {
    const sides = frame.sides ?? {};
    return sides[control] ?? 0;
}

export function buildFrameLayoutFields(frame = {}, {
    aspectRatio = FREE_FRAME_ASPECT_RATIO,
    borderWidth = 10,
} = {}) {
    return [
        {
            key: 'frameAspectRatio',
            type: 'select',
            defaultValue: aspectRatio,
            normalizeValueKey: 'frameAspectRatio',
            parseValueKey: 'frameAspectRatio',
            options: FRAME_ASPECT_RATIO_OPTIONS,
        },
        {
            key: 'frameBorderWidth',
            type: 'number',
            min: 0,
            max: 100,
            step: 0.1,
            defaultValue: borderWidth,
            normalizeValueKey: 'frameBorderWidth',
        },
        ...frameSideControlOrder.map((control) => {
            const definition = sideFieldDefinitions[control];

            return {
                key: definition.key,
                type: 'number',
                min: 0,
                max: 80,
                step: 0.1,
                defaultValue: getFrameSideDefault(frame, control),
            };
        }),
    ];
}

export const defaultTextStyleDefaults = {
    fontIdEn: DEFAULT_FONT_IDS.en,
    fontIdZh: DEFAULT_FONT_IDS.zh,
    fontFamilyEn: FONT_FAMILIES.enDefault,
    fontFamilyZh: FONT_FAMILIES.zhDefault,
    fontSizeRatio: 1,
    fontWeight: 400,
    fontStyle: 'normal',
    letterSpacing: 0,
};

export function buildInfoText(values) {
    const parts = [];

    if (values.focal_length) parts.push(values.focal_length);
    if (values.aperture) parts.push(values.aperture);
    if (values.shutter) parts.push(values.shutter);
    if (values.iso) parts.push(`ISO ${values.iso}`);

    return parts.join('    ');
}

export function buildInfoTextRuns(values, textStyleDefaults = defaultTextStyleDefaults) {
    const runs = [];

    const addValueRun = (text) => {
        if (!text) return;
        if (runs.length > 0) {
            runs.push({
                text: '    ',
                ...textStyleDefaults,
            });
        }

        runs.push({
            text,
            ...textStyleDefaults,
        });
    };

    addValueRun(values.focal_length);
    addValueRun(values.aperture);
    addValueRun(values.shutter);
    addValueRun(values.iso ? `ISO ${values.iso}` : '');

    return runs;
}

export function pickTextFieldValues(customText = {}, keys = []) {
    return keys.reduce((values, key) => {
        values[key] = customText[key] ?? '';
        return values;
    }, {});
}

export function joinMetaParts(parts = [], separator = '  ') {
    return parts.filter(Boolean).join(separator);
}

export function normalizeTemplateText(value, fallbackValue = '') {
    return String(value ?? fallbackValue).trim();
}

export function formatShutterText(shutter, { appendSecondsSuffix = false } = {}) {
    if (!shutter) {
        return null;
    }

    if (!appendSecondsSuffix || shutter.endsWith('s')) {
        return shutter;
    }

    return `${shutter}s`;
}

export function formatIsoText(iso, separator = ' ') {
    return iso ? `ISO${separator}${iso}` : null;
}

export function buildExifMetaPrimary(formattedExif = {}, {
    shutterSuffix = false,
    isoSeparator = ' ',
} = {}) {
    return [
        formattedExif?.focalLength,
        formattedExif?.aperture,
        formatShutterText(formattedExif?.shutter, {
            appendSecondsSuffix: shutterSuffix,
        }),
        formatIsoText(formattedExif?.iso, isoSeparator),
    ].filter(Boolean);
}

export function buildExifMetaSecondary(formattedExif = {}, {
    includeCamera = true,
    includeLens = false,
} = {}) {
    return [
        includeCamera ? formattedExif?.camera : null,
        includeLens ? formattedExif?.lens : null,
    ].filter(Boolean);
}

export function insetRect(area, horizontalInset = 0, verticalInset = 0) {
    return {
        x: area.x + horizontalInset,
        y: area.y + verticalInset,
        width: Math.max(area.width - horizontalInset * 2, 0),
        height: Math.max(area.height - verticalInset * 2, 0),
    };
}

export const infoFieldDefinitions = [
    { key: 'focal_length', type: 'text', defaultValue: '23mm' },
    { key: 'aperture', type: 'text', defaultValue: 'f/1.8' },
    { key: 'shutter', type: 'text', defaultValue: '1/1000' },
    { key: 'iso', type: 'text', defaultValue: '100' },
];

export const fontFieldOptions = getFontFieldOptions();

export function buildFontSelectField({
    key,
    defaultValue = 'systemSans',
}) {
    return {
        key,
        type: 'select',
        defaultValue,
        options: fontFieldOptions.map(({ value }) => ({ value })),
    };
}

export function buildThinBorderToggleField({
    key,
    defaultValue = false,
}) {
    return {
        key,
        type: 'toggle',
        defaultValue,
    };
}
