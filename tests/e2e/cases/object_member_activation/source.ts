export function create(value: any): any {
    return {
        stored: value,
        get value(): any { return this.stored; },
        set value(value: any) { this.stored = value; },
        identity() { return this; },
        capture(): any { return () => this; },
        async delayed(value: any): Promise<any> {
            await Promise.resolve(0);
            return [this, value, () => this];
        },
        *steps(): Generator<any, any, any> { yield this; return this; },
    };
}
export class Receiver { field = 19; }
export const explicit = {
    method(this: Receiver, value: number): number { return this.field + value; },
};
