function clampNumber(value: unknown, min: number, max: number) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(Math.max(numericValue, min), max);
}

function toHexChannel(value: unknown) {
    return Math.round(clampNumber(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
}

export function alphaHexToPercent(alphaHex: string) {
    const numericValue = Number.parseInt(alphaHex, 16);
    return Number.isFinite(numericValue) ? Math.round((numericValue / 255) * 100) : 100;
}

export function alphaPercentToHex(alphaPercent: unknown) {
    return toHexChannel((clampNumber(alphaPercent, 0, 100) / 100) * 255);
}

export function parseColorValue(value: unknown, fallbackValue = '#000000FF'): { hex: string; alpha: number } {
    if (typeof value !== 'string') {
        return typeof fallbackValue === 'string' ? parseColorValue(fallbackValue) : { hex: '000000', alpha: 100 };
    }

    const trimmedValue = value.trim();
    const hexMatch = trimmedValue.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const rawHex = hexMatch[1].toUpperCase();
        const expandedHex = rawHex.length === 3
            ? rawHex.split('').map((character) => character + character).join('')
            : rawHex;

        return {
            hex: expandedHex.slice(0, 6),
            alpha: expandedHex.length === 8 ? alphaHexToPercent(expandedHex.slice(6, 8)) : 100,
        };
    }

    const rgbMatch = trimmedValue.match(/^rgba?\((.+)\)$/i);
    if (rgbMatch) {
        const [red, green, blue, alpha = '1'] = rgbMatch[1].split(',').map((part) => part.trim());
        if (red !== undefined && green !== undefined && blue !== undefined) {
            return {
                hex: [red, green, blue].map((channel) => toHexChannel(Number.parseFloat(channel))).join(''),
                alpha: alpha.trim().endsWith('%')
                    ? Math.round(clampNumber(Number.parseFloat(alpha), 0, 100))
                    : Math.round(clampNumber(Number.parseFloat(alpha) * 100, 0, 100)),
            };
        }
    }

    return fallbackValue !== value ? parseColorValue(fallbackValue) : { hex: '000000', alpha: 100 };
}

export function sanitizeHexDraft(value: unknown) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

export function normalizeHexDraft(value: unknown, fallbackHex = '000000') {
    const compactHex = sanitizeHexDraft(value);
    if (compactHex.length === 3) {
        return compactHex.split('').map((character) => character + character).join('');
    }

    if (compactHex.length >= 6) {
        return compactHex.slice(0, 6);
    }

    return fallbackHex;
}

export function normalizeColorValue(value: unknown, fallbackValue = '#000000FF') {
    const parsedColor = parseColorValue(value, fallbackValue);
    return `#${parsedColor.hex}${alphaPercentToHex(parsedColor.alpha)}`;
}

export function serializeColorValue(hex: unknown, alpha: unknown) {
    return `#${normalizeHexDraft(hex)}${alphaPercentToHex(alpha)}`;
}

export function formatColorHex(value: unknown) {
    return parseColorValue(value).hex;
}

export function formatColorAlpha(value: unknown) {
    return String(parseColorValue(value).alpha);
}
