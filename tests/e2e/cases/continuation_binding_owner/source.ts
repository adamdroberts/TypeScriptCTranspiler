export const marker: any = { token: 11 };
export const replacement: any = { token: 13 };
export const key = Symbol('key');
export function makeAppender(prefix: string): any {
    return async (first: string, second: string): Promise<any> => {
        prefix = prefix + await Promise.resolve(first);
        prefix = prefix + await Promise.resolve(second);
        return prefix;
    };
}
export function owner(value: any): any {
    var shared: any = value;
    let lexical: any = value;
    const immutable: any = value;
    const read = () => [value, shared, lexical, immutable];
    const run = async (): Promise<any> => {
        await Promise.resolve(0);
        value = null; shared = replacement; lexical = key;
        await Promise.resolve(0);
        return [value, shared, lexical, immutable, read];
    };
    return [run, read];
}
export function sequence(value: any): any {
    return function* () { yield value; value = replacement; return value; };
}
export function asynchronous(value: any): any {
    return async function* () { await Promise.resolve(0); yield value; value = key; return value; };
}
export function nested(value: any): any {
    return async () => { await Promise.resolve(0); return async () => { await Promise.resolve(0); value = key; return () => value; }; };
}
