export const marker: any = { token: 11 };
export function insert(target: any): any {
    let trace = '';
    const owner = new Proxy(target, {
        get(object: any, key: any, receiver: any): any { trace += 'G' + String(key) + ';'; return Reflect.get(object, key, receiver); },
        has(object: any, key: any): boolean { trace += 'H' + String(key) + ';'; return Reflect.has(object, key); },
        set(object: any, key: any, value: any, receiver: any): boolean { trace += 'S' + String(key) + ';'; return Reflect.set(object, key, value, receiver); },
        deleteProperty(object: any, key: any): boolean { trace += 'D' + String(key) + ';'; return Reflect.deleteProperty(object, key); },
    });
    const length = Array.prototype.unshift.call(owner, marker, undefined);
    return [owner, length, trace];
}
export function replace(): any {
    const source: any = { length: 2, get 0() { throw marker; }, 1: 'last' };
    return Array.prototype.with.call(source, 0, marker);
}
export function boxed(): any { return Array.prototype.reverse.call(7 as any); }
