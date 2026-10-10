export const marker: any = { token: 11 };
export const key = Symbol('key');
export type Tuple = [head: any, ...tail: any[]];
export const tuple: Tuple = [undefined, null, false, 0, 'word', 37n, key, marker];
export const native: number[] = [1, 2];
export const string: string = 'A💡Z';
export class Boundary {
    read(pair: ObjectEntry<any, any>, property: any): any { return pair[property]; }
}
export async function retained(): Promise<any> {
    const read = () => native[1];
    await Promise.resolve(0);
    return read;
}
