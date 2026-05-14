import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { defaultTemplate, templates } from '../js/templates.ts';
import { getInitialTemplateValues } from '../src/adapters/templateAdapter.ts';

const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
});

try {
    const { useEditorState } = await server.ssrLoadModule('/src/composables/useEditorState.ts');
    const {
        normalizeColorValue,
        normalizeHexDraft,
        parseColorValue,
        sanitizeHexDraft,
        serializeColorValue,
    } = await server.ssrLoadModule('/src/utils/colorValue.ts');
    const { FRAME_LAYOUT_FIELD_KEYS } = await server.ssrLoadModule('/js/core/templates/frame-layout.ts');

    const alternateTemplate = templates.find((template) => (
        template.id !== defaultTemplate.id && template.textGroups?.length > 0
    ));
    assert.ok(alternateTemplate, 'expected at least two templates for state coverage');

    const editor = useEditorState(defaultTemplate, getInitialTemplateValues(defaultTemplate));
    const draftEditor = useEditorState(defaultTemplate, getInitialTemplateValues(defaultTemplate));

    draftEditor.addPhoto('draft-photo', {});
    const defaultValues = getInitialTemplateValues(defaultTemplate);
    draftEditor.replaceFieldDraft(defaultTemplate, 'frameBorderWidth', 12);
    draftEditor.replaceFieldDraft(defaultTemplate, 'frameBorderWidth', 18);
    assert.equal(
        draftEditor.canUndo.value,
        false,
        'draft field updates should preview without entering edit history'
    );
    draftEditor.updateField(defaultTemplate, 'frameBorderWidth', 18);
    assert.equal(draftEditor.canUndo.value, true, 'committing a drafted field should enter history once');
    draftEditor.undo();
    assert.equal(
        draftEditor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id].frameBorderWidth,
        defaultValues.frameBorderWidth,
        'undo should restore the value before the draft interaction'
    );
    draftEditor.updateField(defaultTemplate, 'frameAspectRatio', '1:1');
    assert.equal(
        draftEditor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id].frameAspectRatio,
        '1:1',
        'field commits should resolve template config for aspect ratio changes'
    );
    draftEditor.updateField(defaultTemplate, 'showThinBorder', false);
    draftEditor.updateField(defaultTemplate, 'frameBorderWidth', 32);
    draftEditor.resetLayoutFields(defaultTemplate, [...FRAME_LAYOUT_FIELD_KEYS], defaultValues);
    assert.equal(
        draftEditor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id].frameBorderWidth,
        defaultValues.frameBorderWidth,
        'layout reset should restore shared frame layout fields'
    );
    assert.equal(
        draftEditor.activePhotoState.value.fieldValuesByTemplateId[defaultTemplate.id].showThinBorder,
        false,
        'layout reset should not touch appearance-only fields'
    );

    assert.deepEqual(parseColorValue('#abc'), { hex: 'AABBCC', alpha: 100 });
    assert.deepEqual(parseColorValue('#11223380'), { hex: '112233', alpha: 50 });
    assert.deepEqual(parseColorValue('rgba(10, 20, 30, 0.25)'), { hex: '0A141E', alpha: 25 });
    assert.deepEqual(parseColorValue('rgba(10, 20, 30, 40%)'), { hex: '0A141E', alpha: 40 });
    assert.equal(normalizeColorValue('not-a-color', '#12345678'), '#12345678');
    assert.equal(sanitizeHexDraft('#1g2h3i4j5k6'), '123456');
    assert.equal(normalizeHexDraft('abc'), 'AABBCC');
    assert.equal(serializeColorValue('abcdef', 33), '#ABCDEF54');

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
