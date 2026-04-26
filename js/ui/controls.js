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
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value ?? '#000000';
    input.addEventListener('input', (event) => {
        onChange?.(field, event.target.value, event);
    });
    input.addEventListener('change', () => {
        blurControlAfterChange(input);
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

        button.append(swatchElement, valueElement);
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
                createElement('span', {
                    className: 'nine-grid-picker-mark',
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
        case 'option-input':
            return createOptionInput({
                ...field,
                idPrefix,
            }, value, onChange);
        case 'select':
            if (field.control === 'color-buttons') {
                input = createColorOptionGroup(field, value, onChange);
                break;
            }

            input = field.control === 'nine-grid'
                ? createNineGridPicker(field, value, onChange)
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
