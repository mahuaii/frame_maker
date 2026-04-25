import { createAppearanceThemes } from '../core/templates/appearance.js';

export const sharedAppearanceThemes = {
    white: {
        label: '白色',
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
        colors: {
            textPrimary: '#111111',
            photoBorder: '#000000',
        },
    },
    black: {
        label: '黑色',
        canvasBackground: {
            type: 'solid',
            color: '#121212',
        },
        colors: {
            textPrimary: '#F8FAFC',
            photoBorder: '#FFFFFF',
        },
    },
    blur: {
        label: '彩色模糊',
        canvasBackground: {
            type: 'solid',
            color: '#0f172a',
        },
        barBackground: {
            type: 'photoBlur',
            blur: 28,
            saturate: 1.35,
            brightness: 0.9,
            overlayColor: '#0f172a',
            overlayOpacity: 0.34,
        },
        colors: {
            textPrimary: '#F8FAFC',
            textSecondary: '#CBD5E1',
            line: '#334155',
        },
    },
};

export function createSolidAppearanceThemes({
    white = {},
    black = {},
    includeCanvasBackground = true,
} = {}) {
    const baseThemes = {
        white: {
            label: '白色',
            ...(includeCanvasBackground ? {
                canvasBackground: {
                    type: 'solid',
                    color: '#FFFFFF',
                },
            } : {}),
            colors: {
                photoBorder: '#000000',
            },
        },
        black: {
            label: '黑色',
            ...(includeCanvasBackground ? {
                canvasBackground: {
                    type: 'solid',
                    color: '#121212',
                },
            } : {}),
            colors: {
                photoBorder: '#FFFFFF',
            },
        },
    };

    return createAppearanceThemes(baseThemes, {
        white,
        black,
    });
}
