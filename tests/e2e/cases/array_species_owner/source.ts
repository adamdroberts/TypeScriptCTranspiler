export const marker: any = { token: 11 };
export let calls = 0;
export function Result(this: any, length: number): any {
    calls++;
    return { length, created: true };
}
export const source: number[] = [1, 0, 2];
delete source[1];
Object.defineProperty(source, 'constructor', { value: { [Symbol.species]: Result } });
export function map(): any { return source.map(value => value + 1); }
