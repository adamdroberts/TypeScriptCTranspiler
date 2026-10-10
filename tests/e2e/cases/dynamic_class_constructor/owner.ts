export const memberKey: unique symbol = Symbol('constructor-field');
export const events: string[] = [];
function field(value: any): any { events.push('field'); return value; }
function fallback(value: any): any { events.push('parameter'); return value; }
export function makeOwner(label: any): any {
    return class Named {
        [memberKey] = field(label);
        value: any;
        observed: any;
        target: any;
        tail: any;
        read: any;
        constructor(value: any = fallback(label), observed: any = this[memberKey], ...tail: any[]) {
            events.push('body');
            this.value = value;
            this.observed = observed;
            this.target = new.target;
            this.tail = tail;
            this.read = () => [Named, new.target, this, value, observed, tail];
        }
    };
}
export async function makeAsyncOwner(label: any): Promise<any> {
    await Promise.resolve(0);
    class Local {
        input: any;
        value: any;
        target: any;
        read: any;
        constructor([{ owner: { value } } = { owner: { value: label } }]: any[] = [], ...tail: any[]) {
            this.input = tail;
            this.value = value;
            this.target = new.target;
            this.read = () => [Local, this, value, tail];
        }
    }
    return Local;
}
