export const marker: any = { token: 11 };
export const key = Symbol('key');
export const Constructor = Array;
export const of = Constructor.of;
export function actual(): any {
    const values: number[] = Array.of<number>(marker, key as any, null as any);
    const alias: number[] = of<number>(marker, key as any);
    return [values, alias];
}
export function string(source: string): any { return Array.from(source); }
export function predicate(value: any): any { return Array.isArray(value); }
