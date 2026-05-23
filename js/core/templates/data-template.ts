import { defineTemplate } from './registry.ts';
import { assertKnownFieldValueCapabilities } from './capabilities/field-values.ts';
import { resolveTemplateHandlerCapabilities } from './capabilities/handlers.ts';
import { assertKnownOverlayCapabilities } from './capabilities/overlays.ts';
import type { FrameTemplate } from '../../../src/types/template';

const TEMPLATE_FORMAT = 'frame-maker-template';
const TEMPLATE_FORMAT_VERSION = 1;
const TEMPLATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ASSET_PATH_PATTERN = /^(?:assets\/)[A-Za-z0-9._/-]+$/;

type DataTemplateOptions = {
    sourceType?: string;
    assets?: Record<string, string>;
    releaseAssets?: () => void;
};

const TEMPLATE_SCHEMA_KEYS = [
    'id',
    'label',
    'fields',
    'defaultConfig',
    'frame',
    'backgroundColor',
    'textGroups',
    'overlays',
    'appearanceFieldKey',
    'appearanceDefaultKey',
    'appearanceThemes',
    'handlers',
    'assets',
];

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cloneData<T>(value: T): T {
    if (value === null || value === undefined) {
        return value;
    }

    return JSON.parse(JSON.stringify(value));
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function validateTemplateId(id: unknown) {
    assert(typeof id === 'string' && TEMPLATE_ID_PATTERN.test(id), 'Template id must use kebab-case lowercase letters and numbers.');
}

function validateFrame(frame: unknown, templateId: string) {
    assert(isObject(frame), `Template "${templateId}" requires frame.`);
    assert(isObject(frame.sides), `Template "${templateId}" requires frame.sides.`);

    ['top', 'right', 'bottom', 'left'].forEach((side) => {
        const value = Number(frame.sides[side]);
        assert(Number.isFinite(value) && value >= 0, `Template "${templateId}" requires non-negative frame.sides.${side}.`);
    });
}

function validateFields(fields: unknown, templateId: string) {
    assert(Array.isArray(fields), `Template "${templateId}" requires fields array.`);

    fields.forEach((field, index) => {
        assert(isObject(field), `Template "${templateId}" field ${index + 1} must be an object.`);
        assert(typeof field.key === 'string' && field.key.trim(), `Template "${templateId}" field ${index + 1} requires key.`);
        assert(typeof field.type === 'string' && field.type.trim(), `Template "${templateId}" field "${field.key}" requires type.`);
    });
}

function validateTextGroups(textGroups: unknown, templateId: string) {
    assert(Array.isArray(textGroups), `Template "${templateId}" requires textGroups array.`);
}

function validateHandlers(handlers: unknown = {}, templateId: string) {
    if (handlers === null || handlers === undefined) {
        return;
    }

    assert(isObject(handlers), `Template "${templateId}" handlers must be an object.`);
}

function validateAssets(assets: unknown = {}, templateId: string) {
    assert(isObject(assets), `Template "${templateId}" assets must be an object.`);

    Object.entries(assets).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            return;
        }

        assert(typeof value === 'string', `Template "${templateId}" asset "${key}" must be a string path.`);
        assert(SAFE_ASSET_PATH_PATTERN.test(value) && !value.includes('..'), `Template "${templateId}" asset "${key}" must stay inside assets/.`);
    });
}

function normalizeTemplateSchema(rawTemplate: unknown) {
    assert(isObject(rawTemplate), 'Template package requires template object.');

    const clonedTemplate = cloneData(rawTemplate);
    const template = TEMPLATE_SCHEMA_KEYS.reduce<Record<string, unknown>>((schema, key) => {
        if (Object.hasOwn(clonedTemplate, key)) {
            schema[key] = clonedTemplate[key];
        }
        return schema;
    }, {});
    const templateId = String(template.id);
    validateTemplateId(template.id);
    validateFrame(template.frame, templateId);
    validateFields(template.fields, templateId);
    validateTextGroups(template.textGroups, templateId);
    validateHandlers(template.handlers ?? {}, templateId);
    validateAssets(template.assets ?? {}, templateId);
    assertKnownFieldValueCapabilities(template.fields, templateId);
    assertKnownOverlayCapabilities(template.overlays ?? [], templateId);
    resolveTemplateHandlerCapabilities(template.handlers ?? {}, templateId);

    return {
        ...template,
        overlays: Array.isArray(template.overlays) ? template.overlays : [],
        handlers: isObject(template.handlers) ? template.handlers : {},
        assets: isObject(template.assets) ? template.assets : {},
    };
}

export function createTemplatePackage(template: unknown) {
    const normalizedTemplate = normalizeTemplateSchema(template);

    return {
        format: TEMPLATE_FORMAT,
        formatVersion: TEMPLATE_FORMAT_VERSION,
        template: normalizedTemplate,
    };
}

export function normalizeDataTemplatePackage(rawPackage: unknown) {
    assert(isObject(rawPackage), 'Template package must be an object.');
    assert(rawPackage.format === TEMPLATE_FORMAT, `Unsupported template format "${rawPackage.format}".`);
    assert(rawPackage.formatVersion === TEMPLATE_FORMAT_VERSION, `Unsupported template format version "${rawPackage.formatVersion}".`);

    return createTemplatePackage(rawPackage.template);
}

export function defineTemplatePackage(templatePackage: unknown, options: DataTemplateOptions = {}): FrameTemplate {
    const normalizedPackage = normalizeDataTemplatePackage(templatePackage);
    const template = normalizedPackage.template;
    const templateId = String((template as Record<string, unknown>).id);
    const handlers = resolveTemplateHandlerCapabilities(template.handlers ?? {}, templateId);

    return defineTemplate(({
        ...template,
        ...handlers,
        sourceType: options.sourceType ?? 'data',
        packageFormat: normalizedPackage.format,
        packageFormatVersion: normalizedPackage.formatVersion,
        importedAssets: options.assets ?? {},
        releaseAssets: typeof options.releaseAssets === 'function' ? options.releaseAssets : null,
    } as unknown) as FrameTemplate);
}

export function defineDataTemplate(schema: unknown, options: DataTemplateOptions = {}): FrameTemplate {
    const normalizedPackage = createTemplatePackage(schema);
    return defineTemplatePackage(normalizedPackage, options);
}
