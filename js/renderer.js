import { renderTemplateFrame } from './core/render/runtime.js';

export {
    applyGlobalPostProcessing,
    calculateFrameMetrics,
    calculatePreviewScale,
    createRuntimeHelpers,
    drawBasePhoto,
    fitText,
    measureText,
    safeArea,
    scaleByLongEdge,
    scaleByShortEdge,
    setupCanvas,
} from './core/render/runtime.js';
export {
    EDITABLE_EXIF_FIELDS,
    buildTemplateResolveInput,
    createEditableExifOverrideValues,
    createGlobalRenderSettings,
    createPhotoSource,
    extractExifData,
    resolveEditableExif,
} from './core/render/input.js';

export function renderFrame(canvas, image, template, fieldValues, scaleOrOptions = 1) {
    const options = typeof scaleOrOptions === 'number'
        ? { scale: scaleOrOptions }
        : (scaleOrOptions ?? {});

    return renderTemplateFrame(canvas, image, template, fieldValues, options);
}
