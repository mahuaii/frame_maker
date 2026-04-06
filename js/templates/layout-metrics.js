function buildScaledPhotoArea(photoArea, scale) {
    return {
        x: photoArea.x * scale,
        y: photoArea.y * scale,
        width: photoArea.width * scale,
        height: photoArea.height * scale,
    };
}

export function buildTemplateLayoutMetrics({
    imageWidth,
    imageHeight,
    fullWidth,
    fullHeight,
    photoArea,
    fontSize,
    scale = 1,
}) {
    const scaledPhotoArea = buildScaledPhotoArea(photoArea, scale);

    return {
        imageWidth,
        imageHeight,
        fullWidth,
        fullHeight,
        barBasisSize: fullHeight,
        fontBasisSize: fullHeight,
        barHeight: Math.max(fullHeight - (photoArea.y + photoArea.height), 0),
        fontSize,
        photoArea,
        textRunBaseFontSize: fontSize,
        scaledImageWidth: photoArea.width * scale,
        scaledImageHeight: photoArea.height * scale,
        scaledPhotoArea,
        scaledBarHeight: Math.max(fullHeight - (photoArea.y + photoArea.height), 0) * scale,
        scaledFontSize: fontSize * scale,
        scaledTextRunBaseFontSize: fontSize * scale,
    };
}
