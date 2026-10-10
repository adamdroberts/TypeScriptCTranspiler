export const marker = { token: 11 };
export function fallback(): any { return marker; }
export function direct(this: any, value: number = fallback(), ...tail: number[]): any {
    return [value, tail, this, arguments.length];
}
export const expression = function (value: number = fallback()): any { return [value, arguments.length]; };
export const arrow = (value: number = fallback()): any => value;
export function factory(this: any, value: any): any {
    return (later: number = fallback()): any => [later, this, arguments.length, () => value];
}
export function pattern([first = fallback(), , { value }, ...tail]: any): any { return [first, value, tail]; }
export function generic<T>(value: T): T { return value; }
export function scope(value: any = marker, read: any = () => value): any {
    var value: any = 17;
    return [value, read()];
}
export async function suspended(value: number = fallback()): Promise<any> {
    await Promise.resolve(0);
    return value;
}
export function* generator(value: number = fallback()): Generator<any, any, any> { yield value; return value; }
export class Receiver { value = 19; }
export function native(this: Receiver, value: number = fallback()): any { return [this.value, value]; }
