import {sparseOwner, callableOwner} from './owners';
const marker: any = {token: 17};
const array = sparseOwner(marker);
Object.preventExtensions(array);
for (const key of Reflect.ownKeys(array)) {
    Object.defineProperty(array, key, {configurable: false, writable: false});
}
const callable = callableOwner(marker);
Object.preventExtensions(callable);
for (const key of Reflect.ownKeys(callable)) {
    Object.defineProperty(callable, key, {configurable: false, writable: false});
}
console.log('manual:', Object.isFrozen(array), Object.isSealed(callable), Object.isFrozen(callable));
let trace = '';
const transparent = new Proxy({}, new Proxy({}, {get(owner: any, key: any) {
    trace += String(key) + ';';
    return undefined;
}}));
Object.seal(transparent);
console.log('transparent:', trace);
const symbol = Symbol('owner');
const target: any = {value: marker};
target[symbol] = marker;
Object.defineProperty(target, 'accessor', {get() { return marker; }, configurable: true});
const proxy: any = new Proxy(target, {defineProperty(owner: any, key: any, descriptor: any) {
    trace += String(key) + ':' + Object.keys(descriptor).join('|') + ';';
    return Reflect.defineProperty(owner, key, descriptor);
}});
trace = '';
Object.freeze(proxy);
console.log('freeze:', trace);
console.log('state:', Object.isFrozen(proxy), !Reflect.set(target, symbol, marker), target.accessor === marker);
async function verify(): Promise<void> {
    await Promise.resolve(array);
    console.log('retained:', array[4000] === marker, callable(marker) === marker, Reflect.ownKeys(array).join('|'));
}
verify();
