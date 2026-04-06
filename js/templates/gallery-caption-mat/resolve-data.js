export function resolveGalleryCaptionMatTemplateData(input) {
    return {
        showThinBorder: input.customText.showThinBorder ?? true,
        title: String(input.customText.title ?? '').trim(),
        subtitle: String(input.customText.subtitle ?? '').trim(),
        showSubtitle: input.customText.showSubtitle ?? true,
        titleFontId: input.customText.titleFontId ?? 'miSans',
        titleFontWeight: Number(input.customText.titleFontWeight ?? 400),
        subtitleFontId: input.customText.subtitleFontId ?? 'angieSansStd',
    };
}
