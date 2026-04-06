export function resolveGalleryCaptionMatTemplateData(input) {
    return {
        title: String(input.customText.title ?? '').trim(),
        subtitle: String(input.customText.subtitle ?? '').trim(),
        showSubtitle: Boolean(input.customText.showSubtitle),
        titleFontId: input.customText.titleFontId ?? 'miSans',
        subtitleFontId: input.customText.subtitleFontId ?? 'angieSansStd',
    };
}
