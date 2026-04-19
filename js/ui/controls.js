export const RESET_ICON_PATHS = [
    'M3.2 8a4.8 4.8 0 1 0 1.406-3.394',
    'M3.2 3.6v2.4h2.4',
];

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

    const hex = value.trim().match(/^#?([0-9a-f]{6})$/i);
    if (hex) {
        return hex[1].toUpperCase();
    }

    return value.trim().toUpperCase();
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
    input.addEventListener('input', (event) => {
        onChange?.(field, event.target.value, event);
    });
    return input;
}

function createColorInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value ?? '#000000';
    input.addEventListener('input', (event) => {
        onChange?.(field, event.target.value, event);
    });
    return input;
}

function createTextInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = field.inputType ?? 'text';
    input.value = value ?? '';
    input.addEventListener('input', (event) => {
        onChange?.(field, event.target.value, event);
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
    });
    return input;
}

function createToggleInput(field, value, onChange) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', () => {
        onChange?.(field, input.checked);
    });
    return input;
}

function createColorOptionGroup(field, value, onChange) {
    const input = createElement('div', {
        className: 'option-button-group color-option-list',
        attributes: {
            role: 'radiogroup',
        },
    });

    const selectedValue = value ?? '';

    (field.options ?? []).forEach((option) => {
        const swatch = option.swatch ?? '#111111';
        const isSelected = option.value === selectedValue;
        const button = createElement('button', {
            className: `option-button color-option-row${isSelected ? ' selected' : ''}`,
            attributes: {
                type: 'button',
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': option.label,
            },
            dataset: {
                value: option.value,
            },
            styleProperties: {
                '--option-swatch': swatch,
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
            textContent: option.displayValue ?? formatColorOptionValue(swatch),
        });
        const dividerElement = createElement('span', {
            className: 'color-option-divider',
            attributes: {
                'aria-hidden': 'true',
            },
        });
        const opacityValueElement = createElement('span', {
            className: 'color-option-opacity-value',
            textContent: option.opacity ?? '100',
        });
        const opacityUnitElement = createElement('span', {
            className: 'color-option-opacity-unit',
            textContent: '%',
        });
        const opacityElement = createElement('span', {
            className: 'color-option-opacity',
            children: [opacityValueElement, opacityUnitElement],
        });

        button.append(swatchElement, valueElement, dividerElement, opacityElement);
        button.addEventListener('click', () => {
            input.querySelectorAll('.option-button').forEach((item) => {
                const itemSelected = item === button;
                item.classList.toggle('selected', itemSelected);
                item.setAttribute('aria-checked', itemSelected ? 'true' : 'false');
            });
            onChange?.(field, option.value);
        });

        input.appendChild(button);
    });

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

    const valueClassName = ['range-value', field.valueClassName]
        .filter(Boolean)
        .join(' ');
    const valueLabel = createElement('span', {
        className: valueClassName,
        textContent: field.formatValue ? field.formatValue(input.value) : input.value,
        attributes: {
            id: field.valueId ?? `${input.id}-value`,
        },
    });

    syncRangeProgress(input, input.value);
    input.addEventListener('input', (event) => {
        syncRangeProgress(input, event.target.value);
        valueLabel.textContent = field.formatValue ? field.formatValue(event.target.value) : event.target.value;
        onChange?.(field, event.target.value, event);
    });

    wrapper.append(input, valueLabel);

    return wrapper;
}

export function createFieldPrefixControl(input, label, {
    ariaLabel = label,
} = {}) {
    if (ariaLabel && !input.getAttribute('aria-label')) {
        input.setAttribute('aria-label', ariaLabel);
    }

    return createElement('label', {
        className: 'field-prefix-control',
        children: [
            createElement('span', {
                className: 'field-prefix-control-label',
                textContent: label,
                attributes: {
                    'aria-hidden': 'true',
                },
            }),
            input,
        ],
    });
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
        case 'select':
            input = field.control === 'color-buttons'
                ? createColorOptionGroup(field, value, onChange)
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
        fieldGroup.appendChild(createFieldPrefixControl(input, label, {
            ariaLabel: field.label ?? label,
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
