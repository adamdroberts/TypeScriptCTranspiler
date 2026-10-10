export const events: string[] = [];
export function makeBase(): any {
    return class Base {
        base = (events.push('base-field'), 1);
        value: any;
        target: any;
        constructor(value: any) { events.push('base-body'); this.value = value; this.target = new.target; }
        read(): any { return this.value; }
    };
}
export async function makeDerived(Base: any, label: any): Promise<any> {
    await Promise.resolve(0);
    return class Derived extends Base {
        field = (events.push('derived-field'), label);
        reader: any;
        constructor(value: any = label) {
            const reader = () => this;
            super(value);
            events.push('derived-body');
            this.reader = reader;
        }
        read(): any { return super.read(); }
    };
}
export class NativeBase {
    value: any;
    observed: any;
    constructor(value: any) { this.value = value; this.observed = Object.getPrototypeOf(this); }
}
export function makeDefault(Base: any): any { return class extends Base { field = 3; }; }
