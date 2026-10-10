import {objectOwner, reflectOwner, copied} from './owners';
const marker: any = {token: 17};
const frozenOriginal = Object.isFrozen;
(Object as any).isFrozen = function (owner: any): any { return marker; };
const verdict: boolean = Object.isFrozen({});
const aliasVerdict: boolean = objectOwner.isFrozen({});
console.log('Object:', verdict === marker, aliasVerdict === marker);
Object.isFrozen = frozenOriginal;
const extensibleOriginal = Reflect.isExtensible;
(Reflect as any).isExtensible = function (owner: any): any { return marker; };
const reflectVerdict: boolean = reflectOwner.isExtensible({});
console.log('Reflect:', reflectVerdict === marker);
Reflect.isExtensible = extensibleOriginal;
const target: any[] = new Array(4294967295);
const symbol = Symbol('owner');
const source: any = {'4000': marker};
source[symbol] = marker;
console.log('copy:', copied(target, source) === target, target[4000] === marker, (target as any)[symbol] === marker);
let trace = '';
const descriptor = Object.getOwnPropertyDescriptor(Object, 'assign')!;
Object.defineProperty(Object, 'assign', {configurable: true, get() {
    trace += 'get;';
    return function (this: any, ...actual: any[]): any {
        trace += 'call;';
        return this === Object && actual[0] === marker && actual[1] === marker ? marker : undefined;
    };
}});
async function verify(): Promise<void> {
    const result = Object.assign(marker, await Promise.resolve(marker));
    Object.defineProperty(Object, 'assign', descriptor);
    console.log('suspended:', result === marker, trace);
    console.log('retained:', target.length, Reflect.ownKeys(target).map(String).join('|'));
}
verify();
