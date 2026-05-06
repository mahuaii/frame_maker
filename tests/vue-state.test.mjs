import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { defaultTemplate, templates } from '../js/templates.js';
import { getInitialTemplateValues } from '../src/adapters/templateAdapter.ts';

const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
});

try {
    const { useEditorState } = await server.ssrLoadModule('/src/composables/useEditorState.ts');

    const alternateTemplate = templates.find((template) => template.id !== defaultTemplate.id);
    assert.ok(alternateTemplate, 'expected at least two templates for state coverage');

    const editor = useEditorState(defaultTemplate, getInitialTemplateValues(defaultTemplate));

    editor.addPhoto('photo-a', { make: 'Sony' });
    editor.addPhoto('photo-b', { make: 'Canon' });

    assert.equal(editor.state.value.activePhotoId, 'photo-a');
    assert.equal(editor.activePhotoState.value.exifOverrides.make, 'Sony');
    assert.equal(editor.state.value.photoStatesById['photo-b'].exifOverrides.make, 'Canon');
    assert.equal(editor.canUndo.value, false, 'uploading photos should not enter edit history');

    editor.selectTemplate(alternateTemplate, getInitialTemplateValues(alternateTemplate));
    assert.equal(editor.activePhotoState.value.selectedTemplateId, alternateTemplate.id);
    assert.equal(editor.canUndo.value, true, 'template edits should enter edit history');

    editor.setActivePhoto('photo-b');
    assert.equal(editor.activePhotoState.value.selectedTemplateId, defaultTemplate.id);

    editor.copyActivePhotoSettings();
    editor.setActivePhoto('photo-a');
    editor.pasteSettingsToActivePhoto();

    assert.equal(editor.activePhotoState.value.selectedTemplateId, defaultTemplate.id);
    assert.equal(editor.activePhotoState.value.exifOverrides.make, 'Sony');

    editor.setPhotoExportSelection('photo-a', false);
    assert.equal(editor.state.value.photoStatesById['photo-a'].selectedForExport, false);

    console.log('vue state tests passed');
} finally {
    await server.close();
}
