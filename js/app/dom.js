export function getDomRefs() {
    return {
        canvas: document.getElementById('preview-canvas'),
        previewArea: document.getElementById('preview-area'),
        uploadGuide: document.getElementById('upload-guide'),
        fileInput: document.getElementById('file-input'),
        selectorList: document.getElementById('selector-list'),
        textEditor: document.getElementById('text-editor'),
        inspectorResizer: document.getElementById('inspector-resizer'),
        mainContent: document.querySelector('.main-content'),
    };
}
