export const RESET_ICON_PATHS = [
    'M3.2 8a4.8 4.8 0 1 0 1.406-3.394',
    'M3.2 3.6v2.4h2.4',
];

const TEXT_ALIGN_ICON_PATHS = Object.freeze({
    start: [
        {
            className: 'text-align-radio-guide',
            d: 'M7 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z',
        },
        {
            className: 'text-align-radio-line',
            d: 'M17.25 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-8a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm-4 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z',
        },
    ],
    center: [
        {
            className: 'text-align-radio-guide',
            d: 'M13 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z',
        },
        {
            className: 'text-align-radio-line',
            d: 'M17.25 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-9.5a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm-2 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z',
        },
    ],
    end: [
        {
            className: 'text-align-radio-guide',
            d: 'M18 17.5a.5.5 0 0 1-1 0v-12a.5.5 0 0 1 1 0z',
        },
        {
            className: 'text-align-radio-line',
            d: 'M14.75 10a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-8a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75zm0 5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75z',
        },
    ],
});

const TEXT_DIRECTION_ICON_PATHS = Object.freeze({
    vertical: 'M9.654 13.008A1.5 1.5 0 0 1 11 14.5v2l-.008.153a1.5 1.5 0 0 1-1.338 1.34L9.5 18h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 16.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 13h2zM15.5 6a.5.5 0 0 1 .49.4l.01.1v9.794l1.146-1.146a.501.501 0 0 1 .708.707l-2 2a.5.5 0 0 1-.707 0l-2-2a.5.5 0 0 1 .707-.707L15 16.294V6.5l.01-.1a.5.5 0 0 1 .49-.4m-8 8a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zm2.154-7.992A1.5 1.5 0 0 1 11 7.5v2l-.008.153a1.5 1.5 0 0 1-1.338 1.34L9.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 6h2zM7.5 7a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5z',
    horizontal: 'M15.147 13.147a.5.5 0 0 1 .707 0l2 2a.5.5 0 0 1 0 .707l-2 2a.5.5 0 0 1-.707-.707L16.293 16H6.5l-.101-.01a.5.5 0 0 1 0-.98L6.5 15h9.793l-1.146-1.146a.5.5 0 0 1 0-.707m-5.493-7.14A1.5 1.5 0 0 1 11 7.5v2l-.007.153a1.5 1.5 0 0 1-1.34 1.34L9.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L6 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L7.5 6h2zm7 0A1.5 1.5 0 0 1 18 7.5v2l-.007.153a1.5 1.5 0 0 1-1.34 1.34L16.5 11h-2l-.153-.008a1.5 1.5 0 0 1-1.339-1.339L13 9.5v-2a1.5 1.5 0 0 1 1.347-1.492L14.5 6h2zM14.5 7a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zm-7 0a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5z',
});

const TEXT_ROTATION_ICON_PATH = 'M8.646 9.073a.5.5 0 0 0 .708.708L11.5 7.634v7.793a.5.5 0 0 0 1 0V7.634l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0zM6 17.927a.5.5 0 0 1 0-1h12a.5.5 0 0 1 0 1z';

function appendChildren(element, children = []) {
    children.filter(Boolean).forEach((child) => {
        element.appendChild(child);
    });
}

export function createElement(tagName, {
    className = '',
    textContent,
    attributes = {},
    dataset = {},
    styleProperties = {},
    children = [],
} = {}) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textContent !== undefined) {
        element.textContent = textContent;
    }

    Object.entries(attributes).forEach(([key, value]) => {
        if (value === false || value === null || value === undefined) {
            return;
        }

        if (value === true) {
            element.setAttribute(key, '');
            return;
        }

        element.setAttribute(key, String(value));
    });

    Object.entries(dataset).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            element.dataset[key] = String(value);
        }
    });

    Object.entries(styleProperties).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            element.style.setProperty(key, String(value));
        }
    });

    appendChildren(element, children);

    return element;
}

export function createIcon(paths, {
    viewBox = '0 0 16 16',
    attributes = {},
} = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            svg.setAttribute(key, String(value));
        }
    });

    paths.forEach((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
    });

    return svg;
}

function createTextAlignIcon(value) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'text-align-radio-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    (TEXT_ALIGN_ICON_PATHS[value] ?? TEXT_ALIGN_ICON_PATHS.center).forEach((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', pathData.className);
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('clip-rule', 'evenodd');
        path.setAttribute('d', pathData.d);
        svg.appendChild(path);
    });

    return svg;
}

function createTextDirectionIcon(value) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'text-align-radio-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'text-align-radio-line');
    path.setAttribute('d', TEXT_DIRECTION_ICON_PATHS[value] ?? TEXT_DIRECTION_ICON_PATHS.vertical);
    svg.appendChild(path);

    return svg;
}

function createTextRotationIcon(value) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'text-align-radio-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'text-align-radio-line');
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('clip-rule', 'evenodd');
    path.setAttribute('d', TEXT_ROTATION_ICON_PATH);
    path.setAttribute('transform', `rotate(${Number(value) || 0} 12 12)`);
    svg.appendChild(path);

    return svg;
}

function createNineGridPickerIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'nine-grid-picker-icon');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    [
        'M5 5h8',
        'M4 9h10',
        'M6 13h6',
    ].forEach((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
    });

    return svg;
}

export function createIconButton({
    className = '',
    label,
    title = label,
    iconPaths,
    onClick,
}) {
    const button = createElement('button', {
        className,
        attributes: {
            type: 'button',
            'aria-label': label,
            title,
        },
    });

    if (Array.isArray(iconPaths)) {
        button.appendChild(createIcon(iconPaths));
    }

    if (typeof onClick === 'function') {
        button.addEventListener('click', onClick);
    }

    return button;
}

export function formatColorOptionValue(value) {
    if (typeof value !== 'string') {
        return '000000';
    }

    const hex = value.trim().match(/^#?([0-9a-f]{6})([0-9a-f]{2})?$/i);
    if (hex) {
        return hex[1].toUpperCase();
    }

    return value.trim().toUpperCase();
}

function clampNumber(value, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return min;
    }

    return Math.min(Math.max(numericValue, min), max);
}

function normalizeHexChannel(value) {
    const numericValue = clampNumber(value, 0, 255);

    return Math.round(numericValue).toString(16).padStart(2, '0').toUpperCase();
}

function normalizeHexInputValue(value, fallbackHex = '000000') {
    if (typeof value !== 'string') {
        return fallbackHex;
    }

    const compactValue = value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (compactValue.length === 3) {
        return compactValue
            .split('')
            .map((character) => character + character)
            .join('');
    }

    if (compactValue.length >= 6) {
        return compactValue.slice(0, 6);
    }

    return fallbackHex;
}

function sanitizeHexDraftValue(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

function alphaPercentToHex(alphaPercent) {
    return normalizeHexChannel((clampNumber(alphaPercent, 0, 100) / 100) * 255);
}

function alphaHexToPercent(alphaHex) {
    const numericValue = Number.parseInt(alphaHex, 16);
    if (!Number.isFinite(numericValue)) {
        return 100;
    }

    return Math.round((numericValue / 255) * 100);
}

function parseCssAlpha(value) {
    if (typeof value !== 'string') {
        return 100;
    }

    const trimmedValue = value.trim();
    if (trimmedValue.endsWith('%')) {
        return clampNumber(Number.parseFloat(trimmedValue), 0, 100);
    }

    return clampNumber(Number.parseFloat(trimmedValue) * 100, 0, 100);
}

function parseColorValue(value, fallbackValue = '#000000FF') {
    const fallbackColor = { hex: '000000', alpha: 100 };

    if (typeof value !== 'string') {
        return typeof fallbackValue === 'string' && fallbackValue !== value
            ? parseColorValue(fallbackValue)
            : fallbackColor;
    }

    const trimmedValue = value.trim();
    const hexMatch = trimmedValue.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const rawHex = hexMatch[1].toUpperCase();
        const expandedHex = rawHex.length === 3
            ? rawHex.split('').map((character) => character + character).join('')
            : rawHex;
        const hex = expandedHex.slice(0, 6);
        const alpha = expandedHex.length === 8 ? alphaHexToPercent(expandedHex.slice(6, 8)) : 100;

        return { hex, alpha };
    }

    const rgbMatch = trimmedValue.match(/^rgba?\((.+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1]
            .split(',')
            .map((part) => part.trim());
        const [red, green, blue] = parts;

        if (red !== undefined && green !== undefined && blue !== undefined) {
            return {
                hex: [
                    normalizeHexChannel(Number.parseFloat(red)),
                    normalizeHexChannel(Number.parseFloat(green)),
                    normalizeHexChannel(Number.parseFloat(blue)),
                ].join(''),
                alpha: parts[3] !== undefined ? parseCssAlpha(parts[3]) : 100,
            };
        }
    }

    return typeof fallbackValue === 'string' && fallbackValue !== value
        ? parseColorValue(fallbackValue)
        : fallbackColor;
}

function formatAlphaPercent(value) {
    return String(Math.round(clampNumber(value, 0, 100)));
}

function serializeColorValue({ hex, alpha }) {
    const normalizedHex = normalizeHexInputValue(hex);
    const alphaHex = alphaPercentToHex(alpha);

    return `#${normalizedHex}${alphaHex}`;
}

function normalizeOptionOpacity(opacity, fallbackAlpha = 100) {
    if (opacity === null || opacity === undefined || opacity === '') {
        return fallbackAlpha;
    }

    if (typeof opacity === 'string') {
        return parseCssAlpha(opacity);
    }

    const numericOpacity = Number(opacity);
    if (!Number.isFinite(numericOpacity)) {
        return fallbackAlpha;
    }

    return numericOpacity <= 1
        ? clampNumber(numericOpacity * 100, 0, 100)
        : clampNumber(numericOpacity, 0, 100);
}

export function syncRangeProgress(input, value = input?.value) {
    if (!(input instanceof HTMLInputElement)) {
        return;
    }

    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const currentValue = Number(value);
    const progress = Number.isFinite(currentValue) && max > min
        ? ((currentValue - min) / (max - min)) * 100
        : 0;

    input.style.setProperty('--range-progress', `${Math.min(Math.max(progress, 0), 100)}%`);
}

function syncTextareaHeight(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

const pendingBlurTimers = new WeakMap();

function blurControlAfterChange(target, delay = 0) {
    if (!(target instanceof HTMLElement)) return;

    const pendingTimer = pendingBlurTimers.get(target);
    if (pendingTimer) {
        window.clearTimeout(pendingTimer);
    }

    const blurTarget = () => {
        pendingBlurTimers.delete(target);
        target.blur();
    };

    if (delay > 0) {
        pendingBlurTimers.set(target, window.setTimeout(blurTarget, delay));
        return;
    }

    requestAnimationFrame(blurTarget);
}

function getFieldValue(field, values = {}) {
    return values[field.key] ?? field.defaultValue ?? '';
}

function applyCommonInputAttributes(input, field, {
    idPrefix = 'field',
} = {}) {
    input.id = `${idPrefix}-${field.key}`;
    input.dataset.fieldKey = field.key;

    if (field.placeholder && 'placeholder' in input) {
        input.placeholder = field.placeholder;
    }

    if (field.inputMode && 'inputMode' in input) {
        input.inputMode = field.inputMode;
    }

    return input;
}

function createAutoSizingTextarea(field, value, onChange, defaultRows = 1) {
    const input = document.createElement('textarea');
    input.rows = field.rows ?? defaultRows;
    input.value = value ?? '';
    input.dataset.autoResize = 'true';

    input.addEventListener('input', (event) => {
        syncTextareaHeight(input);
        onChange?.(field, event.target.value, event);
    });
    input.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            blurControlAfterChange(input);
        }
    });

    requestAnimationFrame(() => {
        syncTextareaHeight(input);
    });

    return input;
}

function createNumberInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.step !== undefined) input.step = String(field.step);
    if (field.inputMode) input.inputMode = field.inputMode;
    input.value = value ?? 0;
    input.addEventListener('change', (event) => {
        onChange?.(field, event.target.value, event);
        blurControlAfterChange(input);
    });
    return input;
}

function createColorInput(field, value, onChange) {
    const parsedColor = parseColorValue(value, field.defaultValue ?? '#000000FF');
    let currentColor = {
        hex: parsedColor.hex,
        alpha: parsedColor.alpha,
    };
    const wrapper = createElement('div', {
        className: 'color-alpha-control',
    });
    const nativeInput = document.createElement('input');
    const swatchButton = createElement('button', {
        className: 'color-alpha-swatch-button',
        attributes: {
            type: 'button',
            'aria-label': `${field.label ?? '颜色'}色板`,
        },
    });
    const swatch = createElement('span', {
        className: 'color-alpha-swatch',
        attributes: {
            'aria-hidden': 'true',
        },
    });
    const hexInput = document.createElement('input');
    const alphaInput = document.createElement('input');
    const unit = createElement('span', {
        className: 'color-alpha-unit',
        textContent: '%',
    });

    nativeInput.type = 'color';
    nativeInput.className = 'color-alpha-native-input';
    nativeInput.tabIndex = -1;
    nativeInput.setAttribute('aria-hidden', 'true');
    nativeInput.setAttribute('title', '');
    hexInput.type = 'text';
    hexInput.className = 'color-alpha-hex-input';
    hexInput.maxLength = 6;
    hexInput.inputMode = 'text';
    hexInput.setAttribute('autocomplete', 'off');
    hexInput.setAttribute('aria-label', `${field.label ?? '颜色'} HEX`);
    alphaInput.type = 'number';
    alphaInput.className = 'color-alpha-opacity-input';
    alphaInput.min = '0';
    alphaInput.max = '100';
    alphaInput.step = '1';
    alphaInput.inputMode = 'numeric';
    alphaInput.setAttribute('aria-label', `${field.label ?? '颜色'}不透明度`);

    function syncControl() {
        const serializedValue = serializeColorValue(currentColor);
        const hexValue = normalizedHexForNativeInput(currentColor.hex);

        nativeInput.value = hexValue;
        hexInput.value = currentColor.hex;
        alphaInput.value = formatAlphaPercent(currentColor.alpha);
        swatch.style.setProperty('--color-alpha-swatch-color', serializedValue);
    }

    function normalizedHexForNativeInput(hex) {
        return `#${normalizeHexInputValue(hex)}`;
    }

    function commitColor(nextColor, event) {
        currentColor = {
            hex: normalizeHexInputValue(nextColor.hex, currentColor.hex),
            alpha: clampNumber(nextColor.alpha, 0, 100),
        };
        syncControl();
        onChange?.(field, serializeColorValue(currentColor), event);
    }

    swatchButton.appendChild(swatch);
    swatchButton.addEventListener('click', () => {
        nativeInput.click();
    });
    nativeInput.addEventListener('input', (event) => {
        commitColor({
            ...currentColor,
            hex: normalizeHexInputValue(event.target.value, currentColor.hex),
        }, event);
    });
    nativeInput.addEventListener('change', () => {
        blurControlAfterChange(swatchButton);
    });
    hexInput.addEventListener('input', (event) => {
        const nextHex = sanitizeHexDraftValue(event.target.value);
        hexInput.value = nextHex;
        if (nextHex.length === 6) {
            commitColor({
                ...currentColor,
                hex: nextHex,
            }, event);
        }
    });
    hexInput.addEventListener('change', (event) => {
        commitColor({
            ...currentColor,
            hex: normalizeHexInputValue(event.target.value, currentColor.hex),
        }, event);
        blurControlAfterChange(hexInput);
    });
    hexInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            commitColor({
                ...currentColor,
                hex: normalizeHexInputValue(event.currentTarget.value, currentColor.hex),
            }, event);
            blurControlAfterChange(hexInput);
        }
    });
    alphaInput.addEventListener('input', (event) => {
        commitColor({
            ...currentColor,
            alpha: event.target.value,
        }, event);
    });
    alphaInput.addEventListener('change', (event) => {
        commitColor({
            ...currentColor,
            alpha: event.target.value,
        }, event);
        blurControlAfterChange(alphaInput);
    });
    alphaInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            commitColor({
                ...currentColor,
                alpha: event.currentTarget.value,
            }, event);
            blurControlAfterChange(alphaInput);
        }
    });

    syncControl();
    wrapper.append(nativeInput, swatchButton, hexInput, alphaInput, unit);

    return wrapper;
}

function createTextInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = field.inputType ?? 'text';
    input.value = value ?? '';
    input.addEventListener('input', (event) => {
        onChange?.(field, event.target.value, event);
    });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            blurControlAfterChange(input);
        }
    });
    return input;
}

function createSelectInput(field, value, onChange) {
    const input = document.createElement('select');
    (field.options ?? []).forEach((option) => {
        input.appendChild(createElement('option', {
            textContent: option.label,
            attributes: {
                value: option.value,
            },
        }));
    });
    input.value = value ?? '';
    input.addEventListener('change', (event) => {
        onChange?.(field, event.target.value, event);
        blurControlAfterChange(input);
    });
    return input;
}

function getOptionInputDisplayValue(field, value) {
    const matchedOption = (field.options ?? []).find((option) => String(option.value) === String(value));

    if (matchedOption) {
        return matchedOption.label ?? matchedOption.value;
    }

    return field.formatValue ? field.formatValue(value) : value ?? '';
}

function parseOptionInputValue(field, rawValue, currentValue) {
    if (typeof field.parseValue === 'function') {
        return field.parseValue(rawValue, currentValue);
    }

    return rawValue;
}

function createOptionInput(field, value, onChange) {
    const wrapper = createElement('div', {
        className: ['option-input-control', field.controlClassName].filter(Boolean).join(' '),
    });
    let currentValue = value;
    const input = document.createElement('input');
    const button = createElement('button', {
        className: 'option-input-toggle',
        attributes: {
            type: 'button',
            'aria-label': field.dropdownLabel ?? '展开选项',
            'aria-expanded': 'false',
        },
    });
    const menu = createElement('div', {
        className: 'option-input-menu',
        attributes: {
            role: 'listbox',
            hidden: true,
        },
    });

    input.type = field.inputType ?? 'text';
    input.value = getOptionInputDisplayValue(field, currentValue);
    input.setAttribute('autocomplete', 'off');
    applyCommonInputAttributes(input, field, {
        idPrefix: field.idPrefix ?? 'field',
    });

    function syncOptionSelection() {
        menu.querySelectorAll('.option-input-option').forEach((item) => {
            item.setAttribute('aria-selected', String(item.dataset.value) === String(currentValue) ? 'true' : 'false');
        });
    }

    function syncInputDisplayValue() {
        input.value = getOptionInputDisplayValue(field, currentValue);
        syncOptionSelection();
    }

    function commitValue(nextValue, event) {
        if (Object.is(currentValue, nextValue)) {
            syncInputDisplayValue();
            return;
        }

        currentValue = nextValue;
        syncInputDisplayValue();
        onChange?.(field, nextValue, event);
    }

    function commitTextValue(event) {
        const parsedValue = parseOptionInputValue(field, input.value, currentValue);

        if (parsedValue === null || parsedValue === undefined) {
            syncInputDisplayValue();
            return;
        }

        commitValue(parsedValue, event);
    }

    function closeMenu() {
        menu.hidden = true;
        wrapper.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
        menu.hidden = false;
        wrapper.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
    }

    function toggleMenu() {
        if (menu.hidden) {
            openMenu();
            return;
        }

        closeMenu();
    }

    (field.options ?? []).forEach((option) => {
        const optionButton = createElement('button', {
            className: 'option-input-option',
            textContent: option.label,
            attributes: {
                type: 'button',
                role: 'option',
                'aria-selected': String(option.value) === String(value) ? 'true' : 'false',
            },
            dataset: {
                value: option.value,
            },
        });

        optionButton.addEventListener('click', (event) => {
            commitValue(option.value, event);
            closeMenu();
            blurControlAfterChange(optionButton);
        });

        menu.appendChild(optionButton);
    });

    input.addEventListener('focus', () => {
        input.select();
    });
    input.addEventListener('change', (event) => {
        commitTextValue(event);
        blurControlAfterChange(input);
    });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitTextValue(event);
            closeMenu();
            blurControlAfterChange(input);
        }

        if (event.key === 'ArrowDown' && !menu.hidden) {
            event.preventDefault();
            menu.querySelector('.option-input-option')?.focus();
        }

        if (event.key === 'Escape') {
            closeMenu();
        }
    });
    button.addEventListener('click', () => {
        toggleMenu();
        input.focus();
    });
    wrapper.addEventListener('focusout', () => {
        window.setTimeout(() => {
            if (!wrapper.contains(document.activeElement)) {
                commitTextValue();
                closeMenu();
            }
        }, 0);
    });

    wrapper.append(input, button, menu);

    return wrapper;
}

function createToggleInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', () => {
        onChange?.(field, input.checked);
        blurControlAfterChange(input);
    });
    return input;
}

function createColorOptionGroup(field, value, onChange) {
    const input = createElement('div', {
        className: 'option-button-group color-option-list color-option-grid',
        attributes: {
            role: 'radiogroup',
        },
    });

    const selectedValue = value ?? '';

    (field.options ?? []).forEach((option) => {
        const swatch = option.swatch ?? '#111111';
        const parsedSwatch = parseColorValue(swatch);
        const alpha = normalizeOptionOpacity(option.opacity, parsedSwatch.alpha);
        const displayColor = {
            hex: parsedSwatch.hex,
            alpha,
        };
        const isSelected = option.value === selectedValue;
        const button = createElement('button', {
            className: `option-button color-option-row${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': `${option.label} ${displayColor.hex} ${formatAlphaPercent(alpha)}%`,
                title: option.label,
            },
            dataset: {
                value: option.value,
            },
            styleProperties: {
                '--option-swatch': serializeColorValue(displayColor),
            },
        });

        const swatchElement = createElement('span', {
            className: 'color-option-swatch',
            attributes: {
                'aria-hidden': 'true',
            },
        });
        const valueElement = createElement('span', {
            className: 'color-option-value',
            textContent: displayColor.hex,
        });
        const opacityElement = createElement('span', {
            className: 'color-option-opacity',
            textContent: formatAlphaPercent(alpha),
        });
        const unitElement = createElement('span', {
            className: 'color-option-unit',
            textContent: '%',
        });

        button.append(swatchElement, valueElement, opacityElement, unitElement);
        button.addEventListener('click', () => {
            input.querySelectorAll('.option-button').forEach((item) => {
                const itemSelected = item === button;
                item.classList.toggle('selected', itemSelected);
                item.setAttribute('aria-checked', itemSelected ? 'true' : 'false');
            });
            onChange?.(field, option.value);
            blurControlAfterChange(button);
        });

        input.appendChild(createElement('div', {
            className: 'color-option-grid-row',
            children: [button],
        }));
    });

    return input;
}

function createThemeRadioGroup(field, value, onChange) {
    const input = createElement('div', {
        className: 'option-button-group theme-radio-list',
        attributes: {
            role: 'radiogroup',
            'aria-label': field.label,
        },
    });
    const options = field.options ?? [];
    let selectedValue = value ?? field.defaultValue ?? options[0]?.value ?? '';

    function syncSelection(selectedButton) {
        input.querySelectorAll('.theme-radio-button').forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            button.tabIndex = isSelected ? 0 : -1;
        });
    }

    function commitSelection(button, option, event) {
        if (String(option.value) === String(selectedValue)) {
            syncSelection(button);
            return;
        }

        selectedValue = option.value;
        syncSelection(button);
        onChange?.(field, option.value, event);
    }

    function focusAdjacentButton(currentButton, direction) {
        const buttons = Array.from(input.querySelectorAll('.theme-radio-button'));
        const currentIndex = buttons.indexOf(currentButton);
        if (currentIndex < 0) {
            return;
        }

        const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
        const nextButton = buttons[nextIndex];
        const nextOption = options[nextIndex];
        if (!nextButton || !nextOption) {
            return;
        }

        nextButton.focus();
        commitSelection(nextButton, nextOption);
    }

    options.forEach((option) => {
        const swatch = option.swatch ?? '#111111';
        const parsedSwatch = parseColorValue(swatch);
        const alpha = normalizeOptionOpacity(option.opacity, parsedSwatch.alpha);
        const displayColor = {
            hex: parsedSwatch.hex,
            alpha,
        };
        const isSelected = String(option.value) === String(selectedValue);
        const button = createElement('button', {
            className: `option-button theme-radio-button${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': option.label,
                title: option.label,
                tabindex: isSelected ? '0' : '-1',
            },
            dataset: {
                value: option.value,
            },
            styleProperties: {
                '--theme-radio-swatch': serializeColorValue(displayColor),
            },
            children: [
                createElement('span', {
                    className: 'theme-radio-swatch',
                    attributes: {
                        'aria-hidden': 'true',
                    },
                }),
                createElement('span', {
                    className: 'theme-radio-label',
                    textContent: option.label,
                }),
            ],
        });

        button.addEventListener('click', (event) => {
            commitSelection(button, option, event);
            blurControlAfterChange(button);
        });
        button.addEventListener('keydown', (event) => {
            const keyDirections = {
                ArrowLeft: -1,
                ArrowUp: -1,
                ArrowRight: 1,
                ArrowDown: 1,
            };

            if (event.key in keyDirections) {
                event.preventDefault();
                focusAdjacentButton(button, keyDirections[event.key]);
            }

            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                commitSelection(button, option, event);
            }
        });

        input.appendChild(button);
    });

    if (!input.querySelector('.theme-radio-button.selected')) {
        const firstButton = input.querySelector('.theme-radio-button');
        if (firstButton) {
            firstButton.classList.add('selected');
            firstButton.setAttribute('aria-checked', 'true');
            firstButton.tabIndex = 0;
        }
    }

    return input;
}

function createTextAlignRadioGroup(field, value, onChange) {
    const controlClassNames = {
        'text-direction-radio': 'text-direction-radio',
        'text-rotation-radio': 'text-rotation-radio',
    };
    const input = createElement('div', {
        className: [
            'text-align-radio',
            controlClassNames[field.control],
            field.controlClassName,
        ].filter(Boolean).join(' '),
        attributes: {
            role: 'radiogroup',
            'aria-label': field.label,
        },
    });
    const options = field.options ?? [];
    let selectedValue = value ?? field.defaultValue ?? options[0]?.value ?? '';

    function syncSelection(selectedButton) {
        input.querySelectorAll('.text-align-radio-button').forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            button.tabIndex = isSelected ? 0 : -1;
        });
    }

    function commitSelection(button, option, event) {
        if (String(option.value) === String(selectedValue)) {
            syncSelection(button);
            return;
        }

        selectedValue = option.value;
        syncSelection(button);
        onChange?.(field, option.value, event);
    }

    function focusAdjacentButton(currentButton, direction, event) {
        const buttons = Array.from(input.querySelectorAll('.text-align-radio-button'));
        const currentIndex = buttons.indexOf(currentButton);
        if (currentIndex < 0) {
            return;
        }

        const nextIndex = Math.min(Math.max(currentIndex + direction, 0), buttons.length - 1);
        const nextButton = buttons[nextIndex];
        const nextOption = options[nextIndex];
        if (!nextButton || !nextOption) {
            return;
        }

        nextButton.focus();
        commitSelection(nextButton, nextOption, event);
    }

    options.forEach((option) => {
        const isSelected = String(option.value) === String(selectedValue);
        const button = createElement('button', {
            className: `option-button icon-option-button text-align-radio-button${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': option.label,
                title: option.label,
                tabindex: isSelected ? '0' : '-1',
            },
            dataset: {
                value: option.value,
            },
            children: [
                createTextRadioIcon(field.control, option.value),
            ],
        });

        button.addEventListener('click', (event) => {
            commitSelection(button, option, event);
            blurControlAfterChange(button);
        });
        button.addEventListener('keydown', (event) => {
            const keyDirections = {
                ArrowLeft: -1,
                ArrowUp: -1,
                ArrowRight: 1,
                ArrowDown: 1,
            };

            if (event.key in keyDirections) {
                event.preventDefault();
                focusAdjacentButton(button, keyDirections[event.key], event);
            }

            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                commitSelection(button, option, event);
            }
        });

        input.appendChild(button);
    });

    if (!input.querySelector('.text-align-radio-button.selected')) {
        const firstButton = input.querySelector('.text-align-radio-button');
        if (firstButton) {
            firstButton.classList.add('selected');
            firstButton.setAttribute('aria-checked', 'true');
            firstButton.tabIndex = 0;
        }
    }

    return input;
}

function createTextRadioIcon(control, value) {
    if (control === 'text-direction-radio') {
        return createTextDirectionIcon(value);
    }

    if (control === 'text-rotation-radio') {
        return createTextRotationIcon(value);
    }

    return createTextAlignIcon(value);
}

function createNineGridPicker(field, value, onChange) {
    const input = createElement('div', {
        className: ['nine-grid-picker', field.controlClassName].filter(Boolean).join(' '),
        attributes: {
            role: 'radiogroup',
            'aria-label': field.label,
        },
    });
    const options = field.options ?? [];
    let selectedValue = value ?? field.defaultValue ?? options[0]?.value ?? '';

    function syncSelection(selectedButton) {
        input.querySelectorAll('.nine-grid-picker-button').forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            button.tabIndex = isSelected ? 0 : -1;
        });
    }

    function commitSelection(button, option, event) {
        if (String(option.value) === String(selectedValue)) {
            syncSelection(button);
            return;
        }

        selectedValue = option.value;
        syncSelection(button);
        onChange?.(field, option.value, event);
    }

    function focusAdjacentButton(currentButton, direction) {
        const buttons = Array.from(input.querySelectorAll('.nine-grid-picker-button'));
        const currentIndex = buttons.indexOf(currentButton);
        if (currentIndex < 0) {
            return;
        }

        const nextIndex = Math.min(Math.max(currentIndex + direction, 0), buttons.length - 1);
        const nextButton = buttons[nextIndex];
        const nextOption = options[nextIndex];
        if (!nextButton || !nextOption) {
            return;
        }

        nextButton.focus();
        commitSelection(nextButton, nextOption);
    }

    options.forEach((option) => {
        const isSelected = String(option.value) === String(selectedValue);
        const button = createElement('button', {
            className: `nine-grid-picker-button${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': option.label,
                title: option.label,
                tabindex: isSelected ? '0' : '-1',
            },
            dataset: {
                value: option.value,
            },
            children: [
                createNineGridPickerIcon(),
            ],
        });

        button.addEventListener('click', (event) => {
            commitSelection(button, option, event);
            blurControlAfterChange(button);
        });
        button.addEventListener('keydown', (event) => {
            const keyDirections = {
                ArrowLeft: -1,
                ArrowUp: -3,
                ArrowRight: 1,
                ArrowDown: 3,
            };

            if (event.key in keyDirections) {
                event.preventDefault();
                focusAdjacentButton(button, keyDirections[event.key]);
            }

            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                commitSelection(button, option, event);
            }
        });

        input.appendChild(button);
    });

    if (!input.querySelector('.nine-grid-picker-button.selected')) {
        const firstButton = input.querySelector('.nine-grid-picker-button');
        if (firstButton) {
            firstButton.classList.add('selected');
            firstButton.setAttribute('aria-checked', 'true');
            firstButton.tabIndex = 0;
        }
    }

    return input;
}

function createFrameRegionPicker(field, value, onChange) {
    const input = createElement('div', {
        className: ['frame-region-picker', field.controlClassName].filter(Boolean).join(' '),
        attributes: {
            role: 'radiogroup',
            'aria-label': field.label,
        },
        children: [
            createElement('span', {
                className: 'frame-region-picker-photo',
                attributes: {
                    'aria-hidden': 'true',
                },
            }),
        ],
    });
    const options = field.options ?? [];
    let selectedValue = value ?? field.defaultValue ?? options[0]?.value ?? '';

    function syncSelection(selectedButton) {
        input.querySelectorAll('.frame-region-picker-button').forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle('selected', isSelected);
            button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            button.tabIndex = isSelected ? 0 : -1;
        });
    }

    function commitSelection(button, option, event) {
        if (String(option.value) === String(selectedValue)) {
            syncSelection(button);
            return;
        }

        selectedValue = option.value;
        syncSelection(button);
        onChange?.(field, option.value, event);
    }

    function focusRegion(valueKey, event) {
        const nextButton = input.querySelector(`.frame-region-picker-button[data-value="${valueKey}"]`);
        const nextOption = options.find((option) => String(option.value) === String(valueKey));
        if (!nextButton || !nextOption) {
            return;
        }

        nextButton.focus();
        commitSelection(nextButton, nextOption, event);
    }

    function focusAdjacentButton(currentButton, key, event) {
        const currentValue = currentButton.dataset.value;
        const nextValues = {
            top: { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'center' },
            right: { ArrowLeft: 'center', ArrowDown: 'bottom', ArrowUp: 'top' },
            bottom: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'center' },
            left: { ArrowRight: 'center', ArrowDown: 'bottom', ArrowUp: 'top' },
            center: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' },
        };
        const nextValue = nextValues[currentValue]?.[key];

        if (nextValue) {
            focusRegion(nextValue, event);
        }
    }

    options.forEach((option) => {
        const isSelected = String(option.value) === String(selectedValue);
        const button = createElement('button', {
            className: `frame-region-picker-button frame-region-picker-${option.value}${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': option.label,
                title: option.label,
                tabindex: isSelected ? '0' : '-1',
            },
            dataset: {
                value: option.value,
            },
            children: [
                createElement('span', {
                    className: 'frame-region-picker-mark',
                    attributes: {
                        'aria-hidden': 'true',
                    },
                }),
            ],
        });

        button.addEventListener('click', (event) => {
            commitSelection(button, option, event);
            blurControlAfterChange(button);
        });
        button.addEventListener('keydown', (event) => {
            if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
                focusAdjacentButton(button, event.key, event);
            }

            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                commitSelection(button, option, event);
            }
        });

        input.appendChild(button);
    });

    if (!input.querySelector('.frame-region-picker-button.selected')) {
        const firstButton = input.querySelector('.frame-region-picker-button');
        if (firstButton) {
            firstButton.classList.add('selected');
            firstButton.setAttribute('aria-checked', 'true');
            firstButton.tabIndex = 0;
        }
    }

    return input;
}

function createRangeInput(field, value, onChange) {
    const wrapperClassName = ['range-control', field.controlClassName]
        .filter(Boolean)
        .join(' ');
    const wrapper = createElement('div', {
        className: wrapperClassName,
    });
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(field.min ?? 0);
    input.max = String(field.max ?? 100);
    input.step = String(field.step ?? 1);
    input.value = String(value ?? field.defaultValue ?? input.min);
    applyCommonInputAttributes(input, field, {
        idPrefix: field.idPrefix ?? 'field',
    });

    let valueControl;

    function formatRangeValue(nextValue) {
        return field.formatValue ? field.formatValue(nextValue) : nextValue;
    }

    function normalizeRangeValue(nextValue) {
        const numericValue = Number(nextValue);
        if (!Number.isFinite(numericValue)) {
            return input.value;
        }

        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const clampedValue = Math.min(Math.max(numericValue, min), max);

        return String(Number(clampedValue.toFixed(4)));
    }

    function syncValueControl(nextValue) {
        if (!valueControl) {
            return;
        }

        if (valueControl instanceof HTMLInputElement) {
            valueControl.value = String(nextValue);
            return;
        }

        valueControl.textContent = formatRangeValue(nextValue);
    }

    function commitRangeValue(nextValue, event) {
        const normalizedValue = normalizeRangeValue(nextValue);

        input.value = normalizedValue;
        syncRangeProgress(input, normalizedValue);
        syncValueControl(normalizedValue);
        onChange?.(field, normalizedValue, event);
    }

    if (field.valueInput) {
        valueControl = document.createElement('input');
        valueControl.type = 'number';
        valueControl.className = ['range-value-input', field.valueClassName]
            .filter(Boolean)
            .join(' ');
        valueControl.min = input.min;
        valueControl.max = input.max;
        valueControl.step = input.step;
        valueControl.value = input.value;
        if (field.inputMode) valueControl.inputMode = field.inputMode;
        valueControl.setAttribute('aria-label', `${field.label ?? '数值'}数值`);
        valueControl.addEventListener('change', (event) => {
            commitRangeValue(event.target.value, event);
            blurControlAfterChange(valueControl);
        });
        valueControl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                commitRangeValue(event.currentTarget.value, event);
                blurControlAfterChange(valueControl);
            }
        });
    } else {
        const valueClassName = ['range-value', field.valueClassName]
            .filter(Boolean)
            .join(' ');
        valueControl = createElement('span', {
            className: valueClassName,
            textContent: formatRangeValue(input.value),
            attributes: {
                id: field.valueId ?? `${input.id}-value`,
            },
        });
    }

    syncRangeProgress(input, input.value);
    input.addEventListener('input', (event) => {
        commitRangeValue(event.target.value, event);
    });
    input.addEventListener('change', () => {
        blurControlAfterChange(input);
    });

    wrapper.append(input, valueControl);

    if (field.valueUnit) {
        wrapper.appendChild(createElement('span', {
            className: 'range-value-unit',
            textContent: field.valueUnit,
        }));
    }

    return wrapper;
}

function getNumberStep(field) {
    const numericStep = Number(field.step ?? 1);

    return Number.isFinite(numericStep) && numericStep > 0 ? numericStep : 1;
}

function getNumberStepPrecision(step) {
    const stepText = String(step);
    const exponentMatch = stepText.match(/e-(\d+)$/i);
    if (exponentMatch) {
        return Number(exponentMatch[1]);
    }

    const decimalPart = stepText.split('.')[1];
    return decimalPart ? decimalPart.length : 0;
}

function clampFieldNumberValue(field, value) {
    let nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
        nextValue = Number(field.defaultValue ?? 0);
    }

    const min = Number(field.min);
    const max = Number(field.max);
    if (Number.isFinite(min)) {
        nextValue = Math.max(nextValue, min);
    }
    if (Number.isFinite(max)) {
        nextValue = Math.min(nextValue, max);
    }

    return nextValue;
}

function formatSteppedNumberValue(value, step) {
    const precision = Math.min(getNumberStepPrecision(step), 8);

    return String(Number(value.toFixed(precision)));
}

function createNumberDragHandle(field = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'field-prefix-number-drag-handle');
    svg.setAttribute('viewBox', field.dragHandleViewBox ?? '0 0 12 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const paths = field.dragHandlePaths ?? [
        { d: 'M6 3 3 6h6z' },
        { d: 'M6 13 3 10h6z' },
    ];

    paths.forEach((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathDefinition = typeof pathData === 'string' ? { d: pathData } : pathData;
        path.setAttribute('d', pathDefinition.d);

        if (pathDefinition.fillRule) {
            path.setAttribute('fill-rule', pathDefinition.fillRule);
        }
        if (pathDefinition.clipRule) {
            path.setAttribute('clip-rule', pathDefinition.clipRule);
        }
        if (field.dragHandleRotation) {
            const center = field.dragHandleRotationCenter ?? '12 12';
            path.setAttribute('transform', `rotate(${field.dragHandleRotation} ${center})`);
        }

        svg.appendChild(path);
    });

    return svg;
}

function enablePrefixedNumberDrag(wrapper, handle, input, field, onChange) {
    const pixelsPerStep = 2;
    const step = getNumberStep(field);
    let dragState = null;

    function commitDragValue(nextValue, event) {
        const normalizedValue = formatSteppedNumberValue(clampFieldNumberValue(field, nextValue), step);
        if (input.value === normalizedValue) {
            return;
        }

        input.value = normalizedValue;
        onChange?.(field, normalizedValue, event);
    }

    function endDrag(event) {
        if (!dragState) {
            return;
        }

        if (handle.hasPointerCapture?.(dragState.pointerId)) {
            handle.releasePointerCapture(dragState.pointerId);
        }

        dragState = null;
        wrapper.classList.remove('is-dragging-number');
        event?.preventDefault();
    }

    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        const startValue = clampFieldNumberValue(field, input.value);
        dragState = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startValue,
            lastStepOffset: 0,
        };
        wrapper.classList.add('is-dragging-number');
        handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener('pointermove', (event) => {
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        event.preventDefault();
        const stepOffset = Math.trunc((dragState.startY - event.clientY) / pixelsPerStep);
        if (stepOffset === dragState.lastStepOffset) {
            return;
        }

        dragState.lastStepOffset = stepOffset;
        commitDragValue(dragState.startValue + (stepOffset * step), event);
    });

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
}

function createFieldPrefixLabelContent(label, field = {}) {
    if (!field.prefixIconPaths) {
        return {
            textContent: label,
        };
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'field-prefix-control-icon');
    svg.setAttribute('viewBox', field.prefixIconViewBox ?? '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    field.prefixIconPaths.forEach((pathData) => {
        const pathDefinition = typeof pathData === 'string' ? { d: pathData } : pathData;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathDefinition.d);

        if (pathDefinition.fill) {
            path.setAttribute('fill', pathDefinition.fill);
        }
        if (pathDefinition.stroke) {
            path.setAttribute('stroke', pathDefinition.stroke);
        }
        if (pathDefinition.strokeWidth) {
            path.setAttribute('stroke-width', pathDefinition.strokeWidth);
        }
        if (pathDefinition.strokeLinecap) {
            path.setAttribute('stroke-linecap', pathDefinition.strokeLinecap);
        }
        if (pathDefinition.strokeLinejoin) {
            path.setAttribute('stroke-linejoin', pathDefinition.strokeLinejoin);
        }
        if (pathDefinition.fillRule) {
            path.setAttribute('fill-rule', pathDefinition.fillRule);
        }
        if (pathDefinition.clipRule) {
            path.setAttribute('clip-rule', pathDefinition.clipRule);
        }
        if (field.prefixIconRotation) {
            const center = field.prefixIconRotationCenter ?? '12 12';
            path.setAttribute('transform', `rotate(${field.prefixIconRotation} ${center})`);
        }

        svg.appendChild(path);
    });

    return {
        children: [svg],
    };
}

export function createFieldPrefixControl(input, label, {
    ariaLabel = label,
    field,
    onChange,
} = {}) {
    if (ariaLabel && !input.getAttribute('aria-label')) {
        input.setAttribute('aria-label', ariaLabel);
    }

    const labelElement = createElement('span', {
        className: 'field-prefix-control-label',
        ...createFieldPrefixLabelContent(label, field),
        attributes: {
            'aria-hidden': 'true',
        },
    });
    const wrapper = createElement('label', {
        className: 'field-prefix-control',
        children: [
            labelElement,
            input,
        ],
    });

    if (field?.type === 'number' && input instanceof HTMLInputElement && input.type === 'number') {
        const dragHandle = createNumberDragHandle(field);
        wrapper.classList.add('field-prefix-number-control');
        wrapper.appendChild(dragHandle);
        enablePrefixedNumberDrag(wrapper, dragHandle, input, field, onChange);
    }

    return wrapper;
}

export function createFieldInput(field, {
    values = {},
    idPrefix = 'field',
    onChange,
    defaultRows,
} = {}) {
    const value = getFieldValue(field, values);
    let input;

    switch (field.type) {
        case 'textarea':
            input = createAutoSizingTextarea(field, value, onChange, defaultRows ?? 3);
            break;
        case 'number':
            input = createNumberInput(field, value, onChange);
            break;
        case 'color':
            input = createColorInput(field, value, onChange);
            break;
        case 'input':
            input = createTextInput(field, value, onChange);
            break;
        case 'option-input':
            return createOptionInput({
                ...field,
                idPrefix,
            }, value, onChange);
        case 'select':
            if (field.control === 'theme-radio') {
                input = createThemeRadioGroup(field, value, onChange);
                break;
            }

            if (field.control === 'text-align-radio') {
                input = createTextAlignRadioGroup(field, value, onChange);
                break;
            }

            if (field.control === 'text-direction-radio') {
                input = createTextAlignRadioGroup(field, value, onChange);
                break;
            }

            if (field.control === 'text-rotation-radio') {
                input = createTextAlignRadioGroup(field, value, onChange);
                break;
            }

            if (field.control === 'color-buttons') {
                input = createColorOptionGroup(field, value, onChange);
                break;
            }

            if (field.control === 'nine-grid') {
                input = createNineGridPicker(field, value, onChange);
                break;
            }

            input = field.control === 'frame-region'
                ? createFrameRegionPicker(field, value, onChange)
                : createSelectInput(field, value, onChange);
            break;
        case 'toggle':
            input = createToggleInput(field, value, onChange);
            break;
        case 'range':
            return createRangeInput({
                ...field,
                idPrefix,
            }, value, onChange);
        case 'text':
        default:
            input = createAutoSizingTextarea(field, value, onChange, defaultRows ?? 1);
            break;
    }

    return applyCommonInputAttributes(input, field, { idPrefix });
}

export function createFieldGroup(field, {
    values = {},
    idPrefix = 'field',
    compact = false,
    compactTitle,
    label = field.label,
    onChange,
    defaultRows,
} = {}) {
    const fieldGroup = createElement('fieldset', {
        className: `field-group${compact ? ' field-group-compact' : ''}${field.groupClassName ? ` ${field.groupClassName}` : ''}`,
    });
    const input = createFieldInput(field, {
        values,
        idPrefix,
        onChange,
        defaultRows,
    });

    if (field.type === 'toggle') {
        const toggleLabel = createElement('label', {
            className: 'checkbox-field',
            children: [input],
        });

        if (label) {
            toggleLabel.appendChild(createElement('span', {
                textContent: label,
            }));
        }

        fieldGroup.appendChild(toggleLabel);
        return fieldGroup;
    }

    if (compact && label) {
        if (compactTitle) {
            fieldGroup.appendChild(createElement('label', {
                className: 'field-group-label',
                textContent: compactTitle,
                attributes: {
                    for: `${idPrefix}-${field.key}`,
                },
            }));
        }

        fieldGroup.appendChild(createFieldPrefixControl(input, label, {
            ariaLabel: field.label ?? label,
            field,
            onChange,
        }));
        return fieldGroup;
    }

    if (label) {
        fieldGroup.appendChild(createElement('label', {
            className: 'field-group-label',
            textContent: label,
            attributes: {
                for: `${idPrefix}-${field.key}`,
            },
        }));
    }

    fieldGroup.appendChild(input);

    return fieldGroup;
}
