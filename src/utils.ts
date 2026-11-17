export function getValueByPath(obj: unknown, path: string): unknown {
    let current = obj;
    for (const key of path.split('.')) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = Object.getOwnPropertyDescriptor(current, key)?.value;
    }
    return current;
}

export function wait(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}
