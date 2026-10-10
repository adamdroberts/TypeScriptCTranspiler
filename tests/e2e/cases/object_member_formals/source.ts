export class Receiver { value = 7; }
export const marker = { token: 11 };
export let effects = 0;
function fallback(): any { effects++; return marker; }
export const owner = {
    defaults(first: number = fallback(), second: any = first): any {
        return [first, second, arguments.length];
    },
    pattern([first = fallback(), , { value }, ...tail]: any): any {
        return [first, value, tail];
    },
    retained(first: any = fallback(), read: any = () => first): any { return read; },
    scope(value: any = marker, read: any = () => value): any {
        var value: any = 17;
        return [value, read];
    },
    async delayed(first: number = fallback()): Promise<any> {
        await Promise.resolve(0);
        return first;
    },
    *steps(first: number = fallback()): Generator<any, any, any> { yield first; return first; },
    native(this: Receiver, first: number = fallback()): any { return [this.value, first]; },
};
