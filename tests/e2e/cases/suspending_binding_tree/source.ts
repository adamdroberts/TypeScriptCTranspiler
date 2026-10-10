export let events = "";
export function reset(): void { events = ""; }
export function iterable(values: any[]): any {
    return {
        [Symbol.iterator]() {
            events += "I";
            let index = 0;
            return {
                next() {
                    events += "N";
                    return index < values.length
                        ? { value: values[index++], done: false }
                        : { done: true };
                },
                return() { events += "C"; return {}; },
            };
        },
    };
}
export async function fallback(value: any): Promise<any> {
    events += "D";
    await Promise.resolve(0);
    events += "d";
    return value;
}
export class Owner {
    field = 0;
    private stored = 0;
    set value(value: number) { events += "S"; this.stored = value; }
    get value(): number { return this.stored; }
}
export async function receiver(owner: Owner): Promise<Owner> {
    events += "R";
    await Promise.resolve(0);
    return owner;
}
