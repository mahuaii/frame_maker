import type { PhotoEntry } from './photo';
import type { FrameTemplate, TemplateAppearanceTheme } from './template';
import type { TextModel } from './text';

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type CanvasSize = {
    width: number;
    height: number;
};

export type Insets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type Point = {
    x: number;
    y: number;
};

export type FrameRegionKey = 'top' | 'right' | 'bottom' | 'left' | 'center';

export type FrameSideValues = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type RegionAnchors = Record<string, Point>;

export type FrameMetrics = {
    imageWidth: number;
    imageHeight: number;
    fullWidth: number;
    fullHeight: number;
    canvasSize: CanvasSize;
    sidesPercent: FrameSideValues;
    sidesPx: FrameSideValues;
    fontSize: number;
    photoArea: Rect;
    textRegions: Record<FrameRegionKey, Rect>;
    textInsets: Record<FrameRegionKey, Insets>;
    textContentRegions: Record<FrameRegionKey, Rect>;
    anchors: Record<FrameRegionKey, RegionAnchors>;
    scaledPhotoArea: Rect;
    scaledSidesPx: FrameSideValues;
    scaledTextRegions: Record<FrameRegionKey, Rect>;
    scaledTextInsets: Record<FrameRegionKey, Insets>;
    scaledTextContentRegions: Record<FrameRegionKey, Rect>;
    scaledAnchors: Record<FrameRegionKey, RegionAnchors>;
    scaledFontSize: number;
};

export type RenderMode = 'preview' | 'export';

export type ResizeDimensions = {
    width: number | null;
    height: number | null;
};

export type CompressionSettings = {
    mimeType: string;
    quality: number;
};

export type WatermarkSettings = {
    text?: string | null;
    color?: string;
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | string;
};

export type GlobalRenderSettings = {
    scale?: number;
    mode?: RenderMode | string;
    watermark?: WatermarkSettings | null;
    resize?: ResizeDimensions | null;
    compression?: CompressionSettings | null;
    [key: string]: unknown;
};

export type TemplateResolveInput = {
    photo: PhotoEntry;
    exif: Record<string, unknown> | null;
    customText: Record<string, unknown>;
    global: GlobalRenderSettings;
};

export type RuntimeHelpers = {
    canvas: HTMLCanvasElement;
    canvasSize: CanvasSize;
    [key: string]: unknown;
};

export type TemplateRenderArgs = {
    template: FrameTemplate;
    textModel?: TextModel;
    photo: PhotoEntry;
    config: Record<string, unknown>;
    data: Record<string, unknown>;
    appearance: TemplateAppearanceTheme & { key?: string };
    resolveInput: TemplateResolveInput;
    metrics: FrameMetrics;
    canvasSize: CanvasSize;
    runtime: RuntimeHelpers;
};

export type RenderTemplateOptions = {
    scale?: number;
    photo?: PhotoEntry;
    exifOverrides?: Record<string, string>;
    textModel?: TextModel;
    mode?: RenderMode;
    global?: GlobalRenderSettings;
};

export type CalculateFrameMetrics = (
    image: HTMLImageElement,
    template: FrameTemplate,
    scale?: number,
    rawConfig?: Record<string, unknown>
) => FrameMetrics;

export type CalculatePreviewScale = (
    image: HTMLImageElement,
    template: FrameTemplate,
    containerWidth: number,
    containerHeight: number,
    padding?: number,
    rawConfig?: Record<string, unknown>
) => number;

export type RenderTemplateFrame = (
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    template: FrameTemplate,
    rawConfig: Record<string, unknown>,
    options?: RenderTemplateOptions
) => Promise<RenderTemplateResult | null>;

export type ResolveResizeDimensions = (input: {
    sizePreset: 'original' | '1080' | '2048' | 'custom';
    customWidth: string;
    customHeight: string;
    baseDimensions: CanvasSize;
}) => ResizeDimensions | null;

export type RenderTemplateResult = {
    canvas: HTMLCanvasElement;
    processedCanvas: HTMLCanvasElement;
    config: Record<string, unknown>;
    data: Record<string, unknown>;
    appearance: TemplateAppearanceTheme & { key?: string };
    global: GlobalRenderSettings;
    resolveInput: TemplateResolveInput;
    metrics: FrameMetrics;
    canvasSize: CanvasSize;
    runtime: RuntimeHelpers;
};
