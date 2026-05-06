import { defineTemplate } from './registry.js';

const TEMPLATE_FORMAT = 'frame-maker-template';
const TEMPLATE_FORMAT_VERSION = 1;
const TEMPLATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ASSET_PATH_PATTERN = /^(?:assets\/)[A-Za-z0-9._/-]+$/;

function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cloneData(value) {
    if (value === null || value === undefined) {
        return value;
    }

    return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function validateTemplateId(id) {
    assert(typeof id === 'string' && TEMPLATE_ID_PATTERN.test(id), 'Template id must use kebab-case lowercase letters and numbers.');
}

function validateFrame(frame, templateId) {
    assert(isObject(frame), `Template "${templateId}" requires frame.`);
    assert(isObject(frame.sides), `Template "${templateId}" requires frame.sides.`);

    ['top', 'right', 'bottom', 'left'].forEach((side) => {
        const value = Number(frame.sides[side]);
        assert(Number.isFinite(value) && value >= 0, `Template "${templateId}" requires non-negative frame.sides.${side}.`);
    });
}

function validateFields(fields, templateId) {
    assert(Array.isArray(fields), `Template "${templateId}" requires fields array.`);

    fields.forEach((field, index) => {
        assert(isObject(field), `Template "${templateId}" field ${index + 1} must be an object.`);
        assert(typeof field.key === 'string' && field.key.trim(), `Template "${templateId}" field ${index + 1} requires key.`);
        assert(typeof field.type === 'string' && field.type.trim(), `Template "${templateId}" field "${field.key}" requires type.`);
    });
}

function validateTextGroups(textGroups, templateId) {
    assert(Array.isArray(textGroups), `Template "${templateId}" requires textGroups array.`);
}

function validateAssets(assets = {}, templateId) {
    assert(isObject(assets), `Template "${templateId}" assets must be an object.`);

    Object.entries(assets).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            return;
        }

        assert(typeof value === 'string', `Template "${templateId}" asset "${key}" must be a string path.`);
        assert(SAFE_ASSET_PATH_PATTERN.test(value) && !value.includes('..'), `Template "${templateId}" asset "${key}" must stay inside assets/.`);
    });
}

function normalizeTemplateSchema(rawTemplate) {
    assert(isObject(rawTemplate), 'Template package requires template object.');

    const template = cloneData(rawTemplate);
    validateTemplateId(template.id);
    validateFrame(template.frame, template.id);
    validateFields(template.fields, template.id);
    validateTextGroups(template.textGroups, template.id);
    validateAssets(template.assets ?? {}, template.id);

    return {
        ...template,
        overlays: Array.isArray(template.overlays) ? template.overlays : [],
        assets: isObject(template.assets) ? template.assets : {},
    };
}

export function createTemplatePackage(template) {
    const normalizedTemplate = normalizeTemplateSchema(template);

    return {
        format: TEMPLATE_FORMAT,
        formatVersion: TEMPLATE_FORMAT_VERSION,
        template: normalizedTemplate,
    };
}

export function normalizeDataTemplatePackage(rawPackage) {
    assert(isObject(rawPackage), 'Template package must be an object.');
    assert(rawPackage.format === TEMPLATE_FORMAT, `Unsupported template format "${rawPackage.format}".`);
    assert(rawPackage.formatVersion === TEMPLATE_FORMAT_VERSION, `Unsupported template format version "${rawPackage.formatVersion}".`);

    return createTemplatePackage(rawPackage.template);
}

export function defineDataTemplate(schema, options = {}) {
    const normalizedPackage = createTemplatePackage(schema);
    const template = normalizedPackage.template;

    return defineTemplate({
        ...template,
        sourceType: options.sourceType ?? 'data',
        packageFormat: normalizedPackage.format,
        packageFormatVersion: normalizedPackage.formatVersion,
        importedAssets: options.assets ?? {},
        releaseAssets: typeof options.releaseAssets === 'function' ? options.releaseAssets : null,
    });
}

export const DATA_TEMPLATE_FORMAT = TEMPLATE_FORMAT;
export const DATA_TEMPLATE_FORMAT_VERSION = TEMPLATE_FORMAT_VERSION;
