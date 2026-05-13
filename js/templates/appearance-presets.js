import { createAppearanceThemes } from '../core/templates/appearance.ts';

export const sharedAppearanceThemes = {
    white: {
        label: '白色',
        canvasBackground: {
            type: 'solid',
            color: '#FFFFFF',
        },
        colors: {
            text: {
                textPrimary: '#000000EE',
            },
            frame: {
                photoBorder: '#000000',
            },
        },
    },
    black: {
        label: '黑色',
        canvasBackground: {
            type: 'solid',
            color: '#121212',
        },
        colors: {
            text: {
                textPrimary: '#F8FAFC',
            },
            frame: {
                photoBorder: '#FFFFFF',
            },
        },
    },
    blur: {
        label: '彩色模糊',
        canvasBackground: {
            type: 'photoBlur',
            blur: 28,
            saturate: 1.35,
            brightness: 0.9,
            overlayColor: '#000000',
            overlayOpacity: 0.9,
        },
        barBackground: {
            type: 'photoBlur',
            blur: 28,
            saturate: 1.35,
            brightness: 0.9,
            overlayColor: '#000000',
            overlayOpacity: 0.8,
        },
        colors: {
            text: {
                textPrimary: '#F8FAFC',
                textSecondary: '#CBD5E1',
            },
            frame: {
                line: '#000000C3',
            },
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
                frame: {
                    photoBorder: '#000000',
                },
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
                frame: {
                    photoBorder: '#FFFFFF',
                },
            },
        },
    };

    return createAppearanceThemes(baseThemes, {
        white,
        black,
    });
}
