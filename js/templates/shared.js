import { DEFAULT_FONT_IDS, FONT_FAMILIES, getFontFieldOptions } from '../core/fonts/index.js';

export const defaultSizing = {
    barSizeBasis: 'height',
    fontSizeBasis: 'height',
    barHeightRatio: 0.08,
    fontSizeRatio: 0.028,
    minFontSize: 12,
};

export const defaultTextStyleDefaults = {
    fontIdEn: DEFAULT_FONT_IDS.en,
    fontIdZh: DEFAULT_FONT_IDS.zh,
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

export function pickTextFieldValues(customText = {}, keys = []) {
    return keys.reduce((values, key) => {
        values[key] = customText[key] ?? '';
        return values;
    }, {});
}

export function joinMetaParts(parts = [], separator = '  ') {
    return parts.filter(Boolean).join(separator);
}

export function insetRect(area, horizontalInset = 0, verticalInset = 0) {
    return {
        x: area.x + horizontalInset,
        y: area.y + verticalInset,
        width: Math.max(area.width - horizontalInset * 2, 0),
        height: Math.max(area.height - verticalInset * 2, 0),
    };
}

export const infoFieldDefinitions = [
    { key: 'focal_length', label: '焦距', type: 'text', defaultValue: '23mm' },
    { key: 'aperture', label: '光圈', type: 'text', defaultValue: 'f/1.8' },
    { key: 'shutter', label: '快门', type: 'text', defaultValue: '1/1000' },
    { key: 'iso', label: 'ISO', type: 'text', defaultValue: '100' },
];

export const fontFieldOptions = getFontFieldOptions();
