import assert from 'node:assert/strict';
import { zipSync, unzipSync, strFromU8, strToU8 } from 'fflate';
import {
    addImportedTemplate as addSharedImportedTemplate,
    getTemplateById as getSharedTemplateById,
    getTemplates as getSharedTemplates,
    templates,
} from '../js/templates.ts';
import { defineDataTemplate, defineTemplatePackage, normalizeDataTemplatePackage } from '../js/core/templates/data-template.ts';
import { buildTemplateResolveInput } from '../js/core/render/input.ts';
import { resolveTemplateAppearance } from '../js/core/templates/appearance.ts';
import { createImportedTemplateRegistry } from '../js/core/templates/imported-registry.ts';
import { exportTemplatePackage, importTemplatePackage } from '../js/core/templates/template-package.ts';

const thumbnailBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const disallowedFieldUiKeys = ['label', 'control', 'prefixIconPaths'];

function makeAssetMap(template) {
    const thumbnailPath = template.assets?.thumbnail;
    return thumbnailPath ? { [thumbnailPath]: thumbnailBytes } : {};
}

function makeFile(bytes) {
    return new Blob([bytes], {
        type: 'application/zip',
    });
}

async function blobToBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
}

async function readTemplateJsonFromPackage(blob) {
    const entries = unzipSync(await blobToBytes(blob));
    return JSON.parse(strFromU8(entries['template.json']));
}

async function readEntriesFromPackage(blob) {
    return unzipSync(await blobToBytes(blob));
}

assert.equal(templates.length, 4, 'expected four built-in templates');

const storyResolveInput = buildTemplateResolveInput({
    photo: {
        file: null,
        image: null,
        width: 0,
        height: 0,
        name: null,
        type: null,
        size: null,
    },
    config: {
        fallbackNote: 'No capture data',
    },
});
assert.equal(
    storyResolveInput.config.fallbackNote,
    'No capture data',
    'template resolve input should expose current config values'
);
assert.equal(
    Object.hasOwn(storyResolveInput, 'customText'),
    false,
    'template resolve input should not expose legacy customText config'
);

const appearanceTemplate = templates.find((template) => template.id === 'gallery-caption-mat');
assert.ok(appearanceTemplate, 'expected gallery caption template for appearance coverage');
const customizedAppearance = resolveTemplateAppearance(appearanceTemplate, {
    colorScheme: 'white',
    appearanceBackgroundColor: '#112233',
    appearancePhotoBorderColor: '#44556680',
});
assert.equal(customizedAppearance.canvasBackground.color, '#112233FF');
assert.equal(customizedAppearance.colors.frame.photoBorder, '#44556680');
assert.equal(
    customizedAppearance.colors.text.title,
    appearanceTemplate.appearanceThemes.white.colors.text.title,
    'appearance color fields should not change text tokens'
);

for (const template of templates) {
    assert.equal(template.sourceType, 'builtin', `template "${template.id}" should be loaded from its package json`);
    assert.equal(template.assets?.thumbnail, 'assets/thumbnail.jpg');
    assert.ok(template.importedAssets?.['assets/thumbnail.jpg'], `template "${template.id}" should expose builtin thumbnail asset`);

    const dataTemplate = defineDataTemplate(template);
    assert.equal(dataTemplate.id, template.id);

    const zipBlob = await exportTemplatePackage(template, makeAssetMap(template));
    const zipEntries = await readEntriesFromPackage(zipBlob);
    assert.ok(zipEntries['template.json'], 'template package should include template.json');
    assert.ok(zipEntries['assets/thumbnail.jpg'], 'template package should include assets/thumbnail.jpg');

    const templateJson = await readTemplateJsonFromPackage(zipBlob);
    assert.equal(templateJson.template.id, template.id);
    assert.deepEqual(templateJson.template.assets, template.assets);
    assert.deepEqual(templateJson.template.textGroups, template.textGroups);
    assert.deepEqual(templateJson.template.overlays, template.overlays);
    assert.equal(templateJson.template.importedAssets, undefined);
    assert.equal(templateJson.template.sourceType, undefined);

    templateJson.template.fields.forEach((field) => {
        disallowedFieldUiKeys.forEach((key) => {
            assert.equal(field[key], undefined, `template package field "${field.key}" should not include ${key}`);
        });
        field.options?.forEach((option) => {
            assert.equal(option.label, undefined, `template package field "${field.key}" options should not include label`);
        });
    });

    const imported = await importTemplatePackage(makeFile(await blobToBytes(zipBlob)));
    const redefined = defineTemplatePackage(templateJson);

    assert.equal(redefined.id, template.id);
    assert.deepEqual(imported.template.assets, template.assets);
    assert.deepEqual(imported.template.fields, template.fields);
    assert.deepEqual(imported.template.textGroups, template.textGroups);
    assert.deepEqual(imported.template.overlays, template.overlays);
    imported.releaseAssets();
}

assert.throws(() => {
    defineDataTemplate({
        ...templates[0],
        id: 'Invalid_Id',
    });
}, /Template id/);

assert.throws(() => {
    normalizeDataTemplatePackage({
        format: 'frame-maker-template',
        formatVersion: 1,
        template: {
            ...templates[0],
            assets: {
                thumbnail: '../thumbnail.jpg',
            },
        },
    });
}, /asset/);

assert.throws(() => {
    defineDataTemplate({
        ...templates[0],
        fields: [
            {
                key: 'unknown',
                type: 'text',
                normalizeValueKey: 'missingNormalizer',
            },
        ],
    });
}, /unknown field capability/);

assert.throws(() => {
    defineDataTemplate({
        ...templates[0],
        overlays: [
            {
                type: 'missingOverlay',
            },
        ],
    });
}, /unknown overlay capability/);

await assert.rejects(async () => {
    const bytes = zipSync({
        'not-template.json': strToU8('{}'),
    });
    await importTemplatePackage(makeFile(bytes));
}, /template\.json/);

const registry = createImportedTemplateRegistry(templates);
const importedOne = registry.addImportedTemplate(templates[0]);
const importedTwo = registry.addImportedTemplate(templates[0]);

assert.equal(importedOne.id, `${templates[0].id}--imported-1`);
assert.equal(importedTwo.id, `${templates[0].id}--imported-2`);
assert.equal(registry.templates.length, 6);

const sharedTemplateCount = getSharedTemplates().length;
const importedViaSharedRegistry = addSharedImportedTemplate(templates[0]);

assert.equal(
    getSharedTemplateById(importedViaSharedRegistry.id),
    importedViaSharedRegistry,
    'shared template registry should expose imported templates by id'
);
assert.equal(getSharedTemplates().length, sharedTemplateCount + 1);

console.log('template data tests passed');
