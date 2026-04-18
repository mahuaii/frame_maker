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
        primaryMetaText: exif && metaPrimary.length > 0
            ? metaPrimary.join('   ')
            : (input.customText.fallbackNote || 'EXIF unavailable'),
        secondaryMetaText: metaSecondary.join('   '),
        primaryMetaColorKey: exif && metaPrimary.length > 0 ? 'metaPrimary' : 'metaFallback',
        hasSecondaryMeta: Boolean(metaSecondary.length > 0),
        hasExif: Boolean(exif && (metaPrimary.length > 0 || metaSecondary.length > 0)),
    };
}
