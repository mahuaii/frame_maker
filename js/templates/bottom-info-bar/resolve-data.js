function formatShutterText(shutter) {
    if (!shutter) {
        return null;
    }

    return shutter.endsWith('s') ? shutter : `${shutter}s`;
}

export function resolveBottomInfoBarTemplateData(input) {
    const exif = input.exif;
    const metaItems = [
        exif?.formatted?.focalLength,
        exif?.formatted?.aperture,
        formatShutterText(exif?.formatted?.shutter),
        exif?.formatted?.iso ? `ISO${exif.formatted.iso}` : null,
    ].filter(Boolean);

    return {
        cameraText: exif?.model || exif?.formatted?.camera || 'Unknown Camera',
        metaItems,
    };
}
