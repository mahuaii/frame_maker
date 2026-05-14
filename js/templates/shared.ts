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
