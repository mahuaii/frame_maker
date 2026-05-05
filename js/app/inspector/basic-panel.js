import { FREE_FRAME_ASPECT_RATIO } from '../../core/templates/frame-layout.js';
import { resolveTemplateConfig } from '../../core/templates/registry.js';
import { EDITABLE_EXIF_FIELDS } from '../../renderer.js';
import { RESET_ICON_PATHS, createElement, createIconButton } from '../../ui/controls.js';
import {
    appendInspectorFields,
    createInspectorFieldGrid,
    createInspectorFieldList,
    createInspectorSection,
    getInspectorSectionContent,
} from '../../ui/inspector.js';
import {
    APPEARANCE_FIELD_KEYS,
    COMPACT_FIELD_LABELS,
    FRAME_SIDE_FIELD_KEYS,
    INSPECTOR_SECTION_DEFINITIONS,
    LAYOUT_FIELD_KEYS,
} from '../constants.js';

function getCompactFieldLabel(field) {
    return COMPACT_FIELD_LABELS[field.key] ?? field.label;
}

function isFreeFrameLayout(state) {
    const { fieldValues } = state.getCurrentSnapshot();
    return (fieldValues.frameAspectRatio ?? FREE_FRAME_ASPECT_RATIO) === FREE_FRAME_ASPECT_RATIO;
}

function shouldShowTemplateField(state, field) {
    if (field.hidden) {
        return false;
    }

    if (field.key === 'frameBorderWidth') {
        return !isFreeFrameLayout(state);
    }

    if (FRAME_SIDE_FIELD_KEYS.has(field.key)) {
        return isFreeFrameLayout(state);
    }

    return true;
}

function groupFieldsByInspectorSection(fields) {
    const groups = {
        layout: [],
        appearance: [],
    };

    fields.forEach((field) => {
        if (LAYOUT_FIELD_KEYS.has(field.key)) {
            groups.layout.push(field);
            return;
        }

        if (APPEARANCE_FIELD_KEYS.has(field.key)) {
            groups.appearance.push(field);
        }
    });

    return groups;
}

function commitFieldValue({ template, state, actions }, field, nextValue) {
    const { fieldValues } = state.getCurrentSnapshot();
    fieldValues[field.key] = nextValue;
    const resolvedValues = resolveTemplateConfig(template, fieldValues);
    state.setFieldValues(resolvedValues);
    state.saveTemplateFieldValues(template, resolvedValues);

    if (field.key === 'frameAspectRatio' || field.key === 'colorScheme') {
        actions.renderInspector();
    }
    state.saveActivePhotoState();

    actions.updatePreview();
}

function appendLayoutSectionContent(content, fields, context) {
    const { state } = context;
    const { fieldValues } = state.getCurrentSnapshot();
    const aspectField = fields.find((field) => field.key === 'frameAspectRatio');
    const borderField = fields.find((field) => field.key === 'frameBorderWidth');
    const sideFields = fields.filter((field) => FRAME_SIDE_FIELD_KEYS.has(field.key));

    if (aspectField) {
        appendInspectorFields(content, [aspectField], {
            values: fieldValues,
            onChange: (field, nextValue) => commitFieldValue(context, field, nextValue),
        });
    }

    if (isFreeFrameLayout(state)) {
        const sideFieldGroup = createElement('div', {
            className: 'field-group',
            children: [
                createElement('div', {
                    className: 'field-group-label',
                    textContent: '边界宽度',
                }),
            ],
        });
        sideFieldGroup.appendChild(createInspectorFieldGrid(sideFields, {
            values: fieldValues,
            onChange: (field, nextValue) => commitFieldValue(context, field, nextValue),
            compact: true,
            getLabel: getCompactFieldLabel,
        }));
        content.appendChild(sideFieldGroup);
        return;
    }

    if (borderField) {
        appendInspectorFields(content, [borderField], {
            values: fieldValues,
            onChange: (field, nextValue) => commitFieldValue(context, field, nextValue),
        });
    }
}

function appendFieldSectionContent(content, fields, sectionKey, context) {
    const { state } = context;
    const { fieldValues } = state.getCurrentSnapshot();

    if (sectionKey === 'layout') {
        appendLayoutSectionContent(content, fields, context);
        return;
    }

    appendInspectorFields(content, fields, {
        values: fieldValues,
        onChange: (field, nextValue) => commitFieldValue(context, field, nextValue),
        compact: sectionKey === 'layout',
        getLabel: getCompactFieldLabel,
    });
}

function resetAllLayoutFieldValues({ template, state, actions }) {
    const { fieldValues } = state.getCurrentSnapshot();
    const defaultConfig = resolveTemplateConfig(template);
    const resetValues = {};

    LAYOUT_FIELD_KEYS.forEach((fieldKey) => {
        if (defaultConfig[fieldKey] !== undefined) {
            resetValues[fieldKey] = defaultConfig[fieldKey];
        }
    });

    const resolvedValues = resolveTemplateConfig(template, {
        ...fieldValues,
        ...resetValues,
    });
    state.setFieldValues(resolvedValues);
    state.saveTemplateFieldValues(template, resolvedValues);
    state.saveActivePhotoState();

    actions.renderInspector();
    actions.updatePreview();
}

function createLayoutEditorResetAllButton(context) {
    return createIconButton({
        className: 'field-reset-button inspector-section-reset-button',
        label: '重置版式',
        iconPaths: RESET_ICON_PATHS,
        onClick: () => {
            resetAllLayoutFieldValues(context);
        },
    });
}

function getExifEditorFieldValue(state, fieldKey) {
    const { exifOverrideValues } = state.getCurrentSnapshot();
    const currentValue = exifOverrideValues[fieldKey];
    if (currentValue === null || currentValue === undefined) {
        return '';
    }

    return String(currentValue);
}

function commitExifFieldValue({ state, actions }, fieldKey, nextValue) {
    const { exifOverrideValues } = state.getCurrentSnapshot();
    state.setExifOverrideValues({
        ...exifOverrideValues,
        [fieldKey]: nextValue,
    });
    state.saveActivePhotoState();

    actions.updatePreview();
}

function resetAllExifFieldValues({ state, actions }) {
    const { exifOverrideValues, initialExifOverrideValues } = state.getCurrentSnapshot();
    const resetValues = {};

    EDITABLE_EXIF_FIELDS.forEach((field) => {
        resetValues[field.key] = initialExifOverrideValues[field.key] ?? '';
    });

    state.setExifOverrideValues({
        ...exifOverrideValues,
        ...resetValues,
    });
    state.saveActivePhotoState();

    actions.renderInspector();
    actions.updatePreview();
}

function createExifEditorResetAllButton(context) {
    return createIconButton({
        className: 'field-reset-button inspector-section-reset-button',
        label: '重置拍摄信息',
        iconPaths: RESET_ICON_PATHS,
        onClick: () => {
            resetAllExifFieldValues(context);
        },
    });
}

function createExifEditorContent(context) {
    const { state } = context;
    const fields = EDITABLE_EXIF_FIELDS.map((field) => ({
        ...field,
        type: field.type ?? 'input',
        defaultValue: '',
    }));
    const primaryFieldKeys = ['focalLength', 'fNumber', 'exposureTime', 'iso'];
    const exifFieldValues = fields.reduce((values, field) => {
        values[field.key] = getExifEditorFieldValue(state, field.key);
        return values;
    }, {});
    const fieldOptions = {
        values: exifFieldValues,
        idPrefix: 'field-exif',
        onChange: (field, nextValue) => {
            commitExifFieldValue(context, field.key, nextValue);
        },
    };
    const primaryFields = primaryFieldKeys
        .map((fieldKey) => fields.find((field) => field.key === fieldKey))
        .filter(Boolean);
    const remainingFields = fields.filter((field) => !primaryFieldKeys.includes(field.key));
    const content = createElement('div', {
        className: 'exif-editor-content',
    });

    if (primaryFields.length > 0) {
        content.appendChild(createInspectorFieldGrid(primaryFields, {
            ...fieldOptions,
            compact: false,
        }));
    }

    if (remainingFields.length > 0) {
        content.appendChild(createInspectorFieldList(remainingFields, fieldOptions));
    }

    return content;
}

function getInspectorSectionHeaderAction(sectionKey, context) {
    switch (sectionKey) {
        case 'layout':
            return createLayoutEditorResetAllButton(context);
        case 'exif':
            return createExifEditorResetAllButton(context);
        default:
            return null;
    }
}

export function appendBasicInspectorPanel(textEditor, context) {
    const { template, state } = context;
    const visibleFields = template.fields.filter((field) => shouldShowTemplateField(state, field));
    const fieldsBySection = groupFieldsByInspectorSection(visibleFields);

    INSPECTOR_SECTION_DEFINITIONS.forEach((definition) => {
        const section = createInspectorSection(
            definition.title,
            getInspectorSectionHeaderAction(definition.key, context)
        );
        const content = getInspectorSectionContent(section);

        switch (definition.key) {
            case 'exif':
                content.appendChild(createExifEditorContent(context));
                break;
            default:
                appendFieldSectionContent(content, fieldsBySection[definition.key], definition.key, context);
        }

        textEditor.appendChild(section);
    });
}
