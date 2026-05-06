import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import {
    getTemplateById as getSharedTemplateById,
    getTemplates as getSharedTemplates,
    templates,
} from '../js/templates.js';
import { defineDataTemplate, normalizeDataTemplatePackage } from '../js/core/templates/data-template.js';
import { createImportedTemplateRegistry } from '../js/core/templates/imported-registry.js';
import { exportTemplatePackage, importTemplatePackage } from '../js/core/templates/template-package.js';

const thumbnailBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

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

assert.equal(templates.length, 4, 'expected four built-in templates');

for (const template of templates) {
    const dataTemplate = defineDataTemplate(template);
    assert.equal(dataTemplate.id, template.id);

    const zipBlob = await exportTemplatePackage(template, makeAssetMap(template));
    const imported = await importTemplatePackage(makeFile(await blobToBytes(zipBlob)));
    const redefined = defineDataTemplate(imported.template);

    assert.equal(redefined.id, template.id);
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

const adapter = await import('../src/adapters/templateAdapter.ts');
const sharedTemplateCount = getSharedTemplates().length;
const importedViaAdapter = adapter.addImportedTemplate(templates[0]);

assert.equal(
    getSharedTemplateById(importedViaAdapter.id),
    importedViaAdapter,
    'Vue template adapter should add templates to the shared legacy registry'
);
assert.equal(
    adapter.getTemplateById(importedViaAdapter.id),
    importedViaAdapter,
    'Vue template adapter should read templates from the shared legacy registry'
);
assert.deepEqual(
    adapter.getAllTemplates().map((template) => template.id),
    getSharedTemplates().map((template) => template.id),
    'Vue template adapter and legacy template module should expose the same template list'
);
assert.equal(getSharedTemplates().length, sharedTemplateCount + 1);

console.log('template data tests passed');
