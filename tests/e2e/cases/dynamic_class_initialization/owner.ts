export const memberKey: unique symbol = Symbol('dynamic-field');
export const otherKey: unique symbol = Symbol('other-field');
export const events: string[] = [];
function key(value: any): any { events.push('key'); return value; }
function initialize(value: any): any { events.push('initializer'); return value; }
export function makeOwner(label: any): any {
    return class Named {
        [memberKey] = initialize(label);
        static staticFirst = initialize(label);
        static { events.push('block'); (this as any).same = Named; var local = label; (this as any).readBlock = () => local; }
        [otherKey] = initialize(label);
        static staticLast = initialize(label);
        uninitialized: any;
        deferred = () => [this, label];
        ['__proto__'] = label;
        read(): any { return this[memberKey]; }
        [key('observe')](): any { return label; }
    };
}
export async function makeAsyncOwner(label: any): Promise<any> {
    await Promise.resolve(0);
    class Local {
        [memberKey] = label;
        static original: any = Local;
        static { (this as any).fromBlock = label; }
        read(): any { return this[memberKey]; }
    }
    return Local;
}
