import { getPathValue } from '../utils/object-path.ts';

const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g;

function stringifyTokenValue(value: unknown) {
    if (value === null || value === undefined) {
        return '';
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean).join('  ');
    }

    return String(value);
}

function resolvePhoto(context: Record<string, any> = {}) {
    return context.resolveInput?.photo ?? context.photo ?? null;
}

function resolveExif(context: Record<string, any> = {}) {
    return context.resolveInput?.exif ?? context.exif ?? null;
}

function formatIso(iso: unknown) {
    return iso ? `ISO ${iso}` : null;
}

function buildMetaPrimary(formatted: Record<string, any> = {}) {
    return [
        formatted?.focalLength,
        formatted?.aperture,
        formatted?.shutter,
        formatIso(formatted?.iso),
    ].filter(Boolean).join('  ');
}

function buildMetaSecondary(formatted: Record<string, any> = {}) {
    return [
        formatted?.camera,
        formatted?.lens,
    ].filter(Boolean).join('  ');
}

export const DEFAULT_TOKEN_RESOLVERS = Object.freeze({
    make: ({ exif }) => exif?.make,
    model: ({ exif }) => exif?.model,
    camera: ({ exif }) => exif?.formatted?.camera
        ?? [exif?.make, exif?.model].filter(Boolean).join(' ').trim(),
    dateTimeOriginal: ({ exif }) => exif?.dateTimeOriginal,
    fNumber: ({ exif }) => exif?.formatted?.aperture ?? exif?.fNumber,
    aperture: ({ exif }) => exif?.formatted?.aperture ?? exif?.fNumber,
    exposureTime: ({ exif }) => exif?.formatted?.shutter ?? exif?.exposureTime,
    shutter: ({ exif }) => exif?.formatted?.shutter ?? exif?.exposureTime,
    iso: ({ exif }) => exif?.formatted?.iso ?? exif?.iso,
    focalLength: ({ exif }) => exif?.formatted?.focalLength ?? exif?.focalLength,
    lensModel: ({ exif }) => exif?.lensModel,
    lens: ({ exif }) => exif?.formatted?.lens ?? exif?.lensModel,
    fileName: ({ photo }) => photo?.name,
    photoWidth: ({ photo }) => photo?.width,
    photoHeight: ({ photo }) => photo?.height,
    metaPrimary: ({ data, exif }) => data?.metaPrimary ?? data?.primaryMetaText ?? buildMetaPrimary(exif?.formatted),
    metaSecondary: ({ data, exif }) => data?.metaSecondary ?? data?.secondaryMetaText ?? buildMetaSecondary(exif?.formatted),
});

export function resolveTokenValue(tokenName: string, context: Record<string, any> = {}) {
    const photo = resolvePhoto(context);
    const exif = resolveExif(context);
    const data = context.data ?? {};
    const resolver = DEFAULT_TOKEN_RESOLVERS[tokenName];

    if (resolver) {
        return stringifyTokenValue(resolver({ ...context, photo, exif, data }));
    }

    return stringifyTokenValue(getPathValue(context.tokens, tokenName));
}

export function resolveTextTokens(value: unknown, context: Record<string, any> = {}) {
    return resolveTextTokenResult(value, context).text;
}

export function resolveTextTokenResult(value: unknown, context: Record<string, any> = {}) {
    let hasTokens = false;
    let hasNonEmptyToken = false;
    const text = String(value ?? '').replace(TOKEN_PATTERN, (_, tokenName) => {
        hasTokens = true;
        const tokenValue = resolveTokenValue(tokenName, context);

        if (String(tokenValue).trim()) {
            hasNonEmptyToken = true;
        }

        return tokenValue;
    });

    return {
        text,
        hasTokens,
        hasNonEmptyToken,
    };
}
