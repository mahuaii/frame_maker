import { buildExifMetaPrimary, buildExifMetaSecondary } from '../shared.js';

export function resolveStoryExifTemplateData(input) {
    const exif = input.exif;
    const metaPrimary = buildExifMetaPrimary(exif?.formatted);
    const metaSecondary = buildExifMetaSecondary(exif?.formatted, {
        includeLens: Boolean(input.customText.showLens),
    });

    return {
        metaPrimary,
        metaSecondary,
        hasExif: Boolean(exif && (metaPrimary.length > 0 || metaSecondary.length > 0)),
    };
}
