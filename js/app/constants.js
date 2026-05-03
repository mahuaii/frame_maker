export const DEFAULT_TEMPLATE_ID = 'gallery-caption-mat';
export const ASSET_VERSION = '20260426-000000';

export const THUMBNAIL_MAX_WIDTH = 180;
export const THUMBNAIL_MAX_HEIGHT = 135;

export const DEFAULT_INSPECTOR_WIDTH = 276;
export const MIN_INSPECTOR_WIDTH = 220;
export const MAX_INSPECTOR_WIDTH = 520;
export const MIN_WORKSPACE_WIDTH = 320;

export const UPLOAD_NOTICE_DURATION = 2200;
export const UPLOAD_NOTICE_FADE_DURATION = 180;

export const DEFAULT_EXPORT_SETTINGS = {
    format: 'image/jpeg',
    sizePreset: 'original',
    customWidth: '',
    customHeight: '',
    jpegQuality: 1,
};
export const MIN_JPEG_QUALITY = 0.01;
export const MAX_JPEG_QUALITY = 1;

export const UPLOAD_ICON_PATHS = [
    'M6 3h8l4 4v14H6z',
    'M14 3v4h4',
];

export const INSPECTOR_SECTION_DEFINITIONS = [
    { key: 'layout', title: '版式' },
    { key: 'appearance', title: '外观' },
    { key: 'exif', title: '拍摄信息' },
];

export const LAYOUT_FIELD_KEYS = new Set([
    'frameAspectRatio',
    'frameBorderWidth',
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);

export const FRAME_SIDE_FIELD_KEYS = new Set([
    'frameTop',
    'frameRight',
    'frameBottom',
    'frameLeft',
]);

export const APPEARANCE_FIELD_KEYS = new Set([
    'colorScheme',
    'showThinBorder',
]);

export const COMPACT_FIELD_LABELS = {
    frameTop: 'T',
    frameRight: 'R',
    frameBottom: 'B',
    frameLeft: 'L',
};
