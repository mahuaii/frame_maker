import { FONT_FAMILIES } from '../fonts.js';

export const defaultSizing = {
    barSizeBasis: 'height',
    fontSizeBasis: 'height',
    barHeightRatio: 0.08,
    fontSizeRatio: 0.028,
    minFontSize: 12,
};

export const defaultTextStyleDefaults = {
    fontFamilyEn: FONT_FAMILIES.enDefault,
    fontFamilyZh: FONT_FAMILIES.zhDefault,
    fontSizeRatio: 1,
    fontWeight: 400,
    fontStyle: 'normal',
    letterSpacing: 0,
};

export function buildInfoText(values) {
    const parts = [];

    if (values.focal_length) parts.push(values.focal_length);
    if (values.aperture) parts.push(values.aperture);
    if (values.shutter) parts.push(values.shutter);
    if (values.iso) parts.push(`ISO ${values.iso}`);

    return parts.join('    ');
}

export function buildInfoTextRuns(values, textStyleDefaults = defaultTextStyleDefaults) {
    const runs = [];

    const addValueRun = (text) => {
        if (!text) return;
        if (runs.length > 0) {
            runs.push({
                text: '    ',
                ...textStyleDefaults,
            });
        }

        runs.push({
            text,
            ...textStyleDefaults,
        });
    };

    addValueRun(values.focal_length);
    addValueRun(values.aperture);
    addValueRun(values.shutter);
    addValueRun(values.iso ? `ISO ${values.iso}` : '');

    return runs;
}

export const infoFieldDefinitions = [
    { key: 'focal_length', label: '焦距', defaultValue: '23mm' },
    { key: 'aperture', label: '光圈', defaultValue: 'f/1.8' },
    { key: 'shutter', label: '快门', defaultValue: '1/1000' },
    { key: 'iso', label: 'ISO', defaultValue: '100' },
];
