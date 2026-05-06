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

    const alternateTemplate = templates.find((template) => (
        template.id !== defaultTemplate.id && template.textGroups?.length > 0
    ));
    assert.ok(alternateTemplate, 'expected at least two templates for state coverage');

    const editor = useEditorState(defaultTemplate, getInitialTemplateValues(defaultTemplate));

    editor.addPhoto('photo-a', { make: 'Sony' });
    editor.addPhoto('photo-b', { make: 'Canon' });

    assert.equal(editor.state.value.activePhotoId, 'photo-a');
    assert.equal(editor.activePhotoState.value.exifOverrides.make, 'Sony');
    assert.equal(editor.state.value.photoStatesById['photo-b'].exifOverrides.make, 'Canon');
    assert.equal(editor.canUndo.value, false, 'uploading photos should not enter edit history');
    assert.ok(
        editor.getTextModel(defaultTemplate)[0]?.id,
        'active photo should initialize a text model for the default template'
    );

    editor.selectTemplate(alternateTemplate, getInitialTemplateValues(alternateTemplate));
    assert.equal(editor.activePhotoState.value.selectedTemplateId, alternateTemplate.id);
    assert.equal(editor.canUndo.value, true, 'template edits should enter edit history');
    const alternateRoot = editor.getTextModel(alternateTemplate)[0];
    const alternateItemCount = alternateRoot.items.length;
    editor.addTextObject(alternateTemplate, alternateRoot.id, 'separator');
    assert.equal(
        editor.getTextModel(alternateTemplate)[0].items.length,
        alternateItemCount + 1,
        'text object edits should update the active template text model'
    );
    editor.undo();
    assert.equal(
        editor.getTextModel(alternateTemplate)[0].items.length,
        alternateItemCount,
        'undo should restore the previous text model'
    );
    editor.redo();
    assert.equal(
        editor.getTextModel(alternateTemplate)[0].items.length,
        alternateItemCount + 1,
        'redo should restore the text model edit'
    );

    editor.setActivePhoto('photo-b');
    assert.equal(editor.activePhotoState.value.selectedTemplateId, defaultTemplate.id);
    const photoBRoot = editor.getTextModel(defaultTemplate)[0];
    editor.addTextObject(defaultTemplate, photoBRoot.id, 'separator');
    const photoBTextItemCount = editor.getTextModel(defaultTemplate)[0].items.length;

    editor.copyActivePhotoSettings();
    editor.setActivePhoto('photo-a');
    editor.pasteSettingsToActivePhoto();

    assert.equal(editor.activePhotoState.value.selectedTemplateId, defaultTemplate.id);
    assert.equal(editor.activePhotoState.value.exifOverrides.make, 'Sony');
    assert.equal(
        editor.getTextModel(defaultTemplate)[0].items.length,
        photoBTextItemCount,
        'pasting settings should include copied text models'
    );
    editor.applyActivePhotoSettingsToAll();
    editor.setActivePhoto('photo-b');
    assert.equal(
        editor.getTextModel(defaultTemplate)[0].items.length,
        photoBTextItemCount,
        'applying settings to all should keep text models in sync'
    );
    editor.setActivePhoto('photo-a');

    const stateBeforeReselect = editor.state.value;
    editor.setActivePhoto('photo-a');
    assert.equal(
        editor.state.value,
        stateBeforeReselect,
        'selecting the active photo should be a no-op'
    );

    const activeFieldValues = editor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id];
    const activeExifOverrides = editor.activePhotoState.value.exifOverrides;
    const stateBeforeExportToggle = editor.state.value;
    editor.setPhotoExportSelection('photo-a', false);
    assert.equal(
        editor.state.value,
        stateBeforeExportToggle,
        'export selection should mutate in place instead of replacing the editor state'
    );
    assert.equal(editor.state.value.photoStatesById['photo-a'].selectedForExport, false);
    assert.equal(
        editor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id],
        activeFieldValues,
        'export selection should not replace active field values and trigger preview work'
    );
    assert.equal(
        editor.activePhotoState.value.exifOverrides,
        activeExifOverrides,
        'export selection should not replace active EXIF values and trigger preview work'
    );

    console.log('vue state tests passed');
} finally {
    await server.close();
}
