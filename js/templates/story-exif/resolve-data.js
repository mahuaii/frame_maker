export function resolveStoryExifTemplateData(input) {
    const exif = input.exif;
    const metaPrimary = [
        exif?.formatted?.focalLength,
        exif?.formatted?.aperture,
        exif?.formatted?.shutter,
        exif?.formatted?.iso ? `ISO ${exif.formatted.iso}` : null,
    ].filter(Boolean);

    const metaSecondary = [
        exif?.formatted?.camera,
        input.customText.showLens ? exif?.formatted?.lens : null,
    ].filter(Boolean);

    return {
        title: String(input.customText.title ?? '').trim(),
        subtitle: String(input.customText.subtitle ?? '').trim(),
        showSubtitle: Boolean(input.customText.showSubtitle ?? true),
        titleFontId: input.customText.titleFontId ?? 'angieSansStd',
        metaFontId: input.customText.metaFontId ?? 'systemSans',
        metaScale: Number(input.customText.metaScale ?? 1),
        fallbackNote: String(input.customText.fallbackNote ?? 'EXIF unavailable').trim(),
        metaPrimary,
        metaSecondary,
        hasExif: Boolean(exif && (metaPrimary.length > 0 || metaSecondary.length > 0)),
    };
}
