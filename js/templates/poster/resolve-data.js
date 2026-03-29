export function resolvePosterTemplateData(input) {
    return {
        title: String(input.customText.title ?? '').trim(),
        subtitle: String(input.customText.subtitle ?? '').trim(),
        alignment: input.customText.alignment ?? 'left',
        titleFontId: input.customText.titleFontId ?? 'angieSansStd',
        accentColor: input.customText.accentColor ?? '#ff6b35',
        showAccentLine: Boolean(input.customText.showAccentLine),
        titleScale: Number(input.customText.titleScale ?? 1.35),
    };
}
