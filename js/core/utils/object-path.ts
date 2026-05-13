export function getPathValue(source: unknown, path: unknown): unknown {
    if (!path) {
        return undefined;
    }

    return String(path)
        .split('.')
        .reduce((value: unknown, key) => (
            value && typeof value === 'object'
                ? (value as Record<string, unknown>)[key]
                : undefined
        ), source);
}

export function setPathValue(source: Record<string, unknown>, path: unknown, value: unknown) {
    const parts = String(path).split('.');
    let target = source;

    parts.slice(0, -1).forEach((part) => {
        target[part] = target[part] && typeof target[part] === 'object' ? target[part] : {};
        target = target[part] as Record<string, unknown>;
    });

    target[parts.at(-1) as string] = value;
}
