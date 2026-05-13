import { createElement, createFieldGroup } from './controls.js';

export function createInspectorSection(title, headerAction = null) {
    const headerChildren = [
        createElement('h2', {
            className: 'inspector-section-title',
            textContent: title,
        }),
    ];

    if (headerAction) {
        headerChildren.push(headerAction);
    }

    return createElement('section', {
        className: 'inspector-section',
        children: [
            createElement('div', {
                className: 'inspector-section-header',
                children: headerChildren,
            }),
            createElement('div', {
                className: 'inspector-section-content',
            }),
        ],
    });
}

export function getInspectorSectionContent(section) {
    return section.querySelector('.inspector-section-content');
}

export function createInspectorFieldGrid(fields, options = {}) {
    const grid = createElement('div', {
        className: 'inspector-field-grid inspector-field-grid-contained',
    });
    const compact = options.compact ?? true;

    fields.forEach((field) => {
        const label = typeof options.getLabel === 'function'
            ? options.getLabel(field)
            : options.label;
        grid.appendChild(createFieldGroup(field, {
            ...options,
            compact,
            label,
        }));
    });

    return grid;
}

export function createInspectorFieldList(fields, options = {}) {
    const content = createElement('div', {
        className: options.className ?? 'editor-collapsible-content',
    });

    fields.forEach((field) => {
        content.appendChild(createFieldGroup(field, options));
    });

    return content;
}

export function appendInspectorFields(content, fields, {
    compact = false,
    getLabel,
    ...options
} = {}) {
    if (!fields || fields.length === 0) {
        return;
    }

    const list = compact
        ? createInspectorFieldGrid(fields, {
            ...options,
            getLabel,
            compact: true,
        })
        : createInspectorFieldList(fields, options);

    content.appendChild(list);
}
