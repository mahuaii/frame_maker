export type ExportSettings = {
    format: 'image/jpeg';
    sizePreset: 'original' | '1080' | '2048' | 'custom';
    customWidth: string;
    customHeight: string;
    jpegQuality: number;
};

export type EditableState = {
    activePhotoId: string | null;
    selectedTemplateId: string;
    fieldValuesByTemplateId: Record<string, Record<string, unknown>>;
    exifOverrides: Record<string, string>;
};

export type UiState = {
    inspectorPanel: 'settings' | 'export';
    isDraggingFile: boolean;
    isExporting: boolean;
    errorMessage: string | null;
};
