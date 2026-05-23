function Stable(this: any, count: number, label: string): void {}
function Sealed(this: any): void {}
function Frozen(this: any): void {}
function Proxied(this: any): void {}
function FrozenProxy(this: any): void {}
function TypedDirect(this: any, value: number): void {}
function TypedProto(this: any): void {}
function TypedPrevent(this: any): void {}
function TypedSeal(this: any): void {}
function TypedFreeze(this: any): void {}
function TypedReflect(this: any, value: number): void {}

const first: any = Stable as any;
const second: any = Stable as any;
const stableProto: any = { marker: "stable" };

console.log("same boxed:", Object.is(first, second), first === second);
const lengthDesc: any = Object.getOwnPropertyDescriptor(first, "length");
const nameDesc: any = Object.getOwnPropertyDescriptor(first, "name");
const names: any = Object.getOwnPropertyNames(first);
const ownKeys: any = Reflect.ownKeys(first);
console.log("function length:", first.length, Reflect.get(first, "length"));
console.log("function name:", first.name, Reflect.get(first, "name"));
console.log("function own:", Object.hasOwn(first, "length"), Object.hasOwn(first, "name"), Object.keys(first).length, names.length, names[0], names[1], ownKeys.length, ownKeys[0], ownKeys[1]);
console.log("length desc:", lengthDesc.value, lengthDesc.writable, lengthDesc.enumerable, lengthDesc.configurable);
console.log("name desc:", nameDesc.value, nameDesc.writable, nameDesc.enumerable, nameDesc.configurable);
Object.setPrototypeOf(first, stableProto);
console.log("shared proto:", Object.getPrototypeOf(second).marker);
Object.preventExtensions(first);
console.log("shared extensible:", Reflect.isExtensible(second), Reflect.setPrototypeOf(second, { marker: "blocked" }));

const typedNames: any = Object.getOwnPropertyNames(TypedDirect);
const typedDesc: any = Object.getOwnPropertyDescriptor(TypedDirect, "name");
const typedDescs: any = Object.getOwnPropertyDescriptors(TypedDirect);
console.log("typed function enum:", Object.keys(TypedDirect).length, Object.values(TypedDirect).length, Object.entries(TypedDirect).length);
console.log("typed function own:", typedNames.length, typedNames[0], typedNames[1], Object.hasOwn(TypedDirect, "name"), typedDesc.value, typedDescs.name.value);
Object.setPrototypeOf(TypedProto, { marker: "typed" });
console.log("typed function proto:", Object.getPrototypeOf(TypedProto).marker);
console.log("typed function prevent:", Object.isExtensible(TypedPrevent), Object.preventExtensions(TypedPrevent) === TypedPrevent, Object.isExtensible(TypedPrevent));
console.log("typed function seal:", Object.seal(TypedSeal) === TypedSeal, Object.isSealed(TypedSeal), Object.isFrozen(TypedSeal));
console.log("typed function freeze:", Object.freeze(TypedFreeze) === TypedFreeze, Object.isSealed(TypedFreeze), Object.isFrozen(TypedFreeze));

const reflectKeys: any = Reflect.ownKeys(TypedReflect);
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(TypedReflect, "name");
Reflect.setPrototypeOf(TypedReflect, { marker: "reflect" });
console.log("typed reflect own:", reflectKeys.length, reflectKeys[0], reflectKeys[1], Reflect.get(TypedReflect, "name"), Reflect.has(TypedReflect, "length"), reflectDesc.value);
console.log("typed reflect proto:", Reflect.getPrototypeOf(TypedReflect).marker);
console.log("typed reflect prevent:", Reflect.isExtensible(TypedReflect), Reflect.preventExtensions(TypedReflect), Reflect.isExtensible(TypedReflect));

const sealed: any = Sealed as any;
console.log("seal before:", Object.isSealed(sealed), Object.isFrozen(sealed));
console.log("seal:", Object.seal(sealed) === sealed, Reflect.isExtensible(sealed), Object.isSealed(sealed), Object.isFrozen(sealed));

const frozen: any = Frozen as any;
console.log("freeze:", Object.freeze(frozen) === frozen, Reflect.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen));

const proxiedTarget: any = Proxied as any;
const proxied: any = new Proxy(proxiedTarget, {});
console.log("proxy length:", proxied.length, Reflect.get(proxied, "length"));
console.log("proxy name:", proxied.name, Reflect.get(proxied, "name"));
console.log("proxy seal:", Object.seal(proxied) === proxied, Object.isSealed(proxiedTarget), Object.isSealed(proxied));

const frozenProxyTarget: any = FrozenProxy as any;
const frozenProxy: any = new Proxy(frozenProxyTarget, {});
console.log("proxy freeze:", Object.freeze(frozenProxy) === frozenProxy, Object.isFrozen(frozenProxyTarget), Object.isFrozen(frozenProxy));
