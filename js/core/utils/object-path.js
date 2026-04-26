export function getPathValue(source, path) {
    if (!path) {
        return undefined;
    }

    return String(path)
        .split('.')
        .reduce((value, key) => (value == null ? undefined : value[key]), source);
}

export function setPathValue(source, path, value) {
    const parts = String(path).split('.');
    let target = source;

    parts.slice(0, -1).forEach((part) => {
        target[part] = target[part] && typeof target[part] === 'object' ? target[part] : {};
        target = target[part];
    });

    target[parts.at(-1)] = value;
}
