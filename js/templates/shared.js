export const defaultSizing = {
    barSizeBasis: 'height',
    fontSizeBasis: 'height',
    barHeightRatio: 0.08,
    fontSizeRatio: 0.028,
    minFontSize: 12,
};

export function buildInfoText(values) {
    const parts = [];

    if (values.focal_length) parts.push(values.focal_length);
    if (values.aperture) parts.push(values.aperture);
    if (values.shutter) parts.push(values.shutter);
    if (values.iso) parts.push(`ISO ${values.iso}`);

    return parts.join('    ');
}
