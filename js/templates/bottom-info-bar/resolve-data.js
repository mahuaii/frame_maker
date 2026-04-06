import { buildExifMetaPrimary } from '../shared.js';

export function resolveBottomInfoBarTemplateData(input) {
    const exif = input.exif;

    return {
        cameraText: exif?.model || exif?.formatted?.camera || 'Unknown Camera',
        metaItems: buildExifMetaPrimary(exif?.formatted, {
            shutterSuffix: true,
            isoSeparator: '',
        }),
    };
}
