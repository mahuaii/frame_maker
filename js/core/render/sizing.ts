import type { CanvasSize, ResizeDimensions } from '../../../src/types/render';

type SizePreset = 'original' | '1080' | '2048' | 'custom';

type ResolveResizeInput = {
    sizePreset: SizePreset;
    customWidth: string;
    customHeight: string;
    baseDimensions: CanvasSize;
};

export function parsePositiveInteger(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
        return null;
    }

    return normalized;
}

export function fitInside(
    sourceWidth: number,
    sourceHeight: number,
    containerWidth: number,
    containerHeight: number,
    padding = 0.9
): CanvasSize | null {
    if (!sourceWidth || !sourceHeight || !containerWidth || !containerHeight) {
        return null;
    }

    const maxWidth = containerWidth * padding;
    const maxHeight = containerHeight * padding;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);

    return {
        width: Math.max(Math.round(sourceWidth * scale), 1),
        height: Math.max(Math.round(sourceHeight * scale), 1),
    };
}

export function scaleByLongEdge(
    targetLongEdge: number,
    baseDimensions: CanvasSize
): CanvasSize | null {
    const { width, height } = baseDimensions;
    if (!targetLongEdge || !width || !height) {
        return null;
    }

    if (width >= height) {
        return {
            width: targetLongEdge,
            height: Math.max(Math.round((height / width) * targetLongEdge), 1),
        };
    }

    return {
        width: Math.max(Math.round((width / height) * targetLongEdge), 1),
        height: targetLongEdge,
    };
}

export function resolveResizeDimensions({
    sizePreset,
    customWidth,
    customHeight,
    baseDimensions,
}: ResolveResizeInput): ResizeDimensions | null {
    if (sizePreset === 'original') {
        return null;
    }

    if (sizePreset === 'custom') {
        const parsedWidth = parsePositiveInteger(customWidth);
        const parsedHeight = parsePositiveInteger(customHeight);
        const widthProvided = customWidth !== '';
        const heightProvided = customHeight !== '';

        if (widthProvided && parsedWidth === null) {
            throw new Error('自定义宽度必须是正整数');
        }

        if (heightProvided && parsedHeight === null) {
            throw new Error('自定义高度必须是正整数');
        }

        if (!parsedWidth && !parsedHeight) {
            return null;
        }

        if (parsedWidth && parsedHeight) {
            return {
                width: parsedWidth,
                height: parsedHeight,
            };
        }

        if (parsedWidth) {
            return {
                width: parsedWidth,
                height: Math.max(Math.round((baseDimensions.height / baseDimensions.width) * parsedWidth), 1),
            };
        }

        return {
            width: Math.max(Math.round((baseDimensions.width / baseDimensions.height) * parsedHeight), 1),
            height: parsedHeight,
        };
    }

    return scaleByLongEdge(Number(sizePreset), baseDimensions);
}
