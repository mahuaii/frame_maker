import type { TextColorPaletteItem, TextModel } from './text';

export type ExportSettings = {
    format: 'image/jpeg';
    sizePreset: 'original' | '1080' | '2048' | 'custom';
    customWidth: string;
    customHeight: string;
    jpegQuality: number;
};

export type PhotoEditState = {
    selectedTemplateId: string;
    fieldValuesByTemplateId: Record<string, Record<string, unknown>>;
    textModelsByTemplateId: Record<string, TextModel>;
    textColorPalettesByTemplateId: Record<string, TextColorPaletteItem[]>;
    exifOverrides: Record<string, string>;
    initialExifOverrides: Record<string, string>;
    selectedForExport: boolean;
};

export type CopiedPhotoSettings = {
    selectedTemplateId: string;
    fieldValuesByTemplateId: Record<string, Record<string, unknown>>;
    textModelsByTemplateId: Record<string, TextModel>;
    textColorPalettesByTemplateId: Record<string, TextColorPaletteItem[]>;
};

export type EditableState = {
    activePhotoId: string | null;
    photoStatesById: Record<string, PhotoEditState>;
    fallbackState: PhotoEditState;
    copiedSettings: CopiedPhotoSettings | null;
};

export type UiState = {
    inspectorPanel: 'settings' | 'export';
    isDraggingFile: boolean;
    isExporting: boolean;
    errorMessage: string | null;
};
