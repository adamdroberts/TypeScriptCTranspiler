function Stable(this: any): void {}
function Sealed(this: any): void {}
function Frozen(this: any): void {}
function Proxied(this: any): void {}
function FrozenProxy(this: any): void {}

const first: any = Stable as any;
const second: any = Stable as any;
const stableProto: any = { marker: "stable" };

console.log("same boxed:", Object.is(first, second), first === second);
Object.setPrototypeOf(first, stableProto);
console.log("shared proto:", Object.getPrototypeOf(second).marker);
Object.preventExtensions(first);
console.log("shared extensible:", Reflect.isExtensible(second), Reflect.setPrototypeOf(second, { marker: "blocked" }));

const sealed: any = Sealed as any;
console.log("seal before:", Object.isSealed(sealed), Object.isFrozen(sealed));
console.log("seal:", Object.seal(sealed) === sealed, Reflect.isExtensible(sealed), Object.isSealed(sealed), Object.isFrozen(sealed));

const frozen: any = Frozen as any;
console.log("freeze:", Object.freeze(frozen) === frozen, Reflect.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));

const proxiedTarget: any = Proxied as any;
const proxied: any = new Proxy(proxiedTarget, {});
console.log("proxy seal:", Object.seal(proxied) === proxied, Object.isSealed(proxiedTarget), Object.isSealed(proxied));

const frozenProxyTarget: any = FrozenProxy as any;
const frozenProxy: any = new Proxy(frozenProxyTarget, {});
console.log("proxy freeze:", Object.freeze(frozenProxy) === frozenProxy, Object.isFrozen(frozenProxyTarget), Object.isFrozen(frozenProxy));
