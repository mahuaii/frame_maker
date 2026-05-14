import {
    FRAME_ASPECT_RATIO_OPTIONS,
    FRAME_ASPECT_RATIO_FIELD_KEY,
    FRAME_BORDER_WIDTH_FIELD_KEY,
    FRAME_SIDE_FIELD_KEYS,
    FRAME_SIDE_KEYS,
    FREE_FRAME_ASPECT_RATIO,
} from '../core/templates/frame-layout.ts';

export const defaultFrameFont = {
    basis: 'height',
    size: 2.8,
    min: 12,
};

function getFrameSideDefault(frame: Record<string, any> = {}, control: string) {
    const sides = frame.sides ?? {};
    return sides[control] ?? 0;
}

export function buildFrameLayoutFields(frame: Record<string, any> = {}, {
    aspectRatio = FREE_FRAME_ASPECT_RATIO,
    borderWidth = 10,
} = {}) {
    return [
        {
            key: FRAME_ASPECT_RATIO_FIELD_KEY,
            type: 'select',
            defaultValue: aspectRatio,
            normalizeValueKey: 'frameAspectRatio',
            parseValueKey: 'frameAspectRatio',
            options: FRAME_ASPECT_RATIO_OPTIONS,
        },
        {
            key: FRAME_BORDER_WIDTH_FIELD_KEY,
            type: 'number',
            min: 0,
            max: 100,
            step: 0.1,
            defaultValue: borderWidth,
            normalizeValueKey: 'frameBorderWidth',
        },
        ...FRAME_SIDE_KEYS.map((control) => ({
            key: FRAME_SIDE_FIELD_KEYS[control],
            type: 'number',
            min: 0,
            max: 80,
            step: 0.1,
            defaultValue: getFrameSideDefault(frame, control),
        })),
    ];
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

export function buildExifMetaPrimary(formattedExif: Record<string, any> = {}, {
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

export function buildExifMetaSecondary(formattedExif: Record<string, any> = {}, {
    includeCamera = true,
    includeLens = false,
} = {}) {
    return [
        includeCamera ? formattedExif?.camera : null,
        includeLens ? formattedExif?.lens : null,
    ].filter(Boolean);
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
