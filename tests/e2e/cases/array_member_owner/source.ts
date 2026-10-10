export const marker: any = { token: 11 };
export const key = Symbol('key');
export const values: number[] = [1, 2, 3];
export const alias = values;
export function map(): any {
    return values.map((value: number, index: number): any => {
        if (index === 0) { delete values[1]; (values as any)[2] = marker; values.push(marker); }
        return index === 0 ? key : value;
    });
}
export function pop(source: number[]): any { return source.pop(); }
