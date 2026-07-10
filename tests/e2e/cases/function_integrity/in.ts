function Stable(this: any, count: number, label: string): void {}
function Sealed(this: any): void {}
function Frozen(this: any): void {}
function Proxied(this: any): void {}
function FrozenProxy(this: any): void {}
function ProxyGet(this: any): void {}
function ProxySet(this: any): void {}
function ProxyDescriptor(this: any): void {}
function ProxyKeys(this: any): void {}
function ProxyKeysClosed(this: any): void {}
function ProxyHas(this: any): void {}
function ProxyDefine(this: any, value: number): void {}
function ProxyDelete(this: any): void {}
function TypedDirect(this: any, value: number): void {}
function TypedProto(this: any): void {}
function TypedPrevent(this: any): void {}
function TypedSeal(this: any): void {}
function TypedFreeze(this: any): void {}
function TypedReflect(this: any, value: number): void {}
function TypedDefine(this: any, value: number): void {}
function TypedDelete(this: any): void {}
function ZeroLength(this: any): void {}

const ArrowValue: any = ((value: number): number => value) as any;
const FunctionValue: any = (function NamedValue(value: number): number { return value; }) as any;

const first: any = Stable as any;
const second: any = Stable as any;
const stableProto: any = { marker: "stable" };

console.log("same boxed:", Object.is(first, second), first === second);
const lengthDesc: any = Object.getOwnPropertyDescriptor(first, "length");
const nameDesc: any = Object.getOwnPropertyDescriptor(first, "name");
const prototypeDesc: any = Object.getOwnPropertyDescriptor(first, "prototype");
const allDescs: any = Object.getOwnPropertyDescriptors(first);
const names: any = Object.getOwnPropertyNames(first);
const ownKeys: any = Reflect.ownKeys(first);
console.log("function length:", first.length, Reflect.get(first, "length"));
console.log("function name:", first.name, Reflect.get(first, "name"));
console.log("constructability:", Object.hasOwn(ArrowValue, "prototype"), Object.hasOwn(FunctionValue, "prototype"), Reflect.ownKeys(ArrowValue).join(","), Reflect.ownKeys(FunctionValue).join(","));
try {
    Reflect.construct(ArrowValue, []);
    console.log("arrow construct:", "ok");
} catch (err: any) {
    console.log("arrow construct:", err);
}
console.log("function own:", Object.hasOwn(first, "length"), Object.hasOwn(first, "name"), Object.hasOwn(first, "prototype"), Object.keys(first).length, names.length, names[0], names[1], names[2], ownKeys.length, ownKeys[0], ownKeys[1], ownKeys[2]);
console.log("length desc:", lengthDesc.value, lengthDesc.writable, lengthDesc.enumerable, lengthDesc.configurable);
console.log("name desc:", nameDesc.value, nameDesc.writable, nameDesc.enumerable, nameDesc.configurable);
console.log("prototype desc:", prototypeDesc.value.constructor === first, prototypeDesc.writable, prototypeDesc.enumerable, prototypeDesc.configurable, allDescs.prototype.value === first.prototype);
Object.setPrototypeOf(first, stableProto);
console.log("shared proto:", Object.getPrototypeOf(second).marker);
Object.preventExtensions(first);
console.log("shared extensible:", Reflect.isExtensible(second), Reflect.setPrototypeOf(second, { marker: "blocked" }));

const typedNames: any = Object.getOwnPropertyNames(TypedDirect);
const typedDesc: any = Object.getOwnPropertyDescriptor(TypedDirect, "name");
const typedDescs: any = Object.getOwnPropertyDescriptors(TypedDirect);
console.log("typed function enum:", Object.keys(TypedDirect).length, Object.values(TypedDirect).length, Object.entries(TypedDirect).length);
console.log("typed function own:", typedNames.length, typedNames[0], typedNames[1], typedNames[2], Object.hasOwn(TypedDirect, "name"), Object.hasOwn(TypedDirect, "prototype"), typedDesc.value, typedDescs.name.value, typedDescs.prototype.writable);
Object.setPrototypeOf(TypedProto, { marker: "typed" });
console.log("typed function proto:", Object.getPrototypeOf(TypedProto).marker);
console.log("typed function prevent:", Object.isExtensible(TypedPrevent), Object.preventExtensions(TypedPrevent) === TypedPrevent, Object.isExtensible(TypedPrevent));
console.log("typed function seal:", Object.seal(TypedSeal) === TypedSeal, Object.isSealed(TypedSeal), Object.isFrozen(TypedSeal));
console.log("typed function freeze:", Object.freeze(TypedFreeze) === TypedFreeze, Object.isSealed(TypedFreeze), Object.isFrozen(TypedFreeze));

const reflectKeys: any = Reflect.ownKeys(TypedReflect);
const reflectDesc: any = Reflect.getOwnPropertyDescriptor(TypedReflect, "name");
const reflectPrototypeDesc: any = Reflect.getOwnPropertyDescriptor(TypedReflect, "prototype");
Reflect.setPrototypeOf(TypedReflect, { marker: "reflect" });
console.log("typed reflect own:", reflectKeys.length, reflectKeys[0], reflectKeys[1], reflectKeys[2], Reflect.get(TypedReflect, "name"), Reflect.has(TypedReflect, "length"), Reflect.has(TypedReflect, "prototype"), reflectDesc.value, reflectPrototypeDesc.writable);
console.log("typed reflect proto:", Reflect.getPrototypeOf(TypedReflect).marker);
console.log("typed reflect prevent:", Reflect.isExtensible(TypedReflect), Reflect.preventExtensions(TypedReflect), Reflect.isExtensible(TypedReflect));

const defineResult = Object.defineProperty(TypedDefine, "name", { value: "TypedDefine", writable: false, enumerable: false, configurable: false });
console.log("typed function define:", defineResult === TypedDefine, Reflect.defineProperty(TypedDefine, "length", { value: 1, writable: false, enumerable: false, configurable: false }), Reflect.defineProperty(TypedDefine, "length", { value: 9 }), Reflect.get(TypedDefine, "length"));
const replacementPrototype: any = { marker: "replacement" };
console.log("typed function prototype define:", Reflect.defineProperty(TypedDefine, "prototype", { value: replacementPrototype, writable: true, enumerable: false, configurable: false }), Reflect.get(TypedDefine, "prototype") === replacementPrototype);
console.log("typed function delete:", Reflect.deleteProperty(TypedDelete, "length"), Reflect.deleteProperty(TypedDelete, "name"), Reflect.deleteProperty(TypedDelete, "missing"), Reflect.has(TypedDelete, "length"), Reflect.has(TypedDelete, "name"));

const zeroLength: any = ZeroLength as any;
console.log("function length samevalue:", Reflect.defineProperty(zeroLength, "length", { value: 0, writable: false, enumerable: false, configurable: false }), Reflect.defineProperty(zeroLength, "length", { value: -0, writable: false, enumerable: false, configurable: false }), Object.is(Reflect.get(zeroLength, "length"), 0));
try {
    Object.defineProperty(zeroLength, "length", { value: -0, writable: false, enumerable: false, configurable: false });
    console.log("function length samevalue object:", "ok");
} catch (err: any) {
    console.log("function length samevalue object:", err);
}

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

function trueDefine(target: any, prop: any, desc: any): boolean {
    return true;
}

function trueDelete(target: any, prop: any): boolean {
    return true;
}

function badGet(target: any, prop: any, receiver: any): any {
    if (prop === "length") return 9;
    return Reflect.get(target, prop, receiver);
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
    return true;
}

function badDescriptor(target: any, prop: any): any {
    if (prop === "name") return { value: "Wrong", writable: false, enumerable: false, configurable: false };
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

function missingKeys(target: any): any {
    return ["name"];
}

function completeKeys(target: any): any {
    return ["length", "name", "prototype"];
}

function extraKeys(target: any): any {
    return ["length", "name", "prototype", "extra"];
}

function falseHas(target: any, prop: any): boolean {
    return false;
}

const proxyGetTarget: any = ProxyGet as any;
const proxyGet: any = new Proxy(proxyGetTarget, { get: badGet as any });
try {
    console.log("proxy function get length:", Reflect.get(proxyGet, "length"));
} catch (err: any) {
    console.log("proxy function get length:", err);
}

const proxySetTarget: any = ProxySet as any;
const proxySet: any = new Proxy(proxySetTarget, { set: trueSet as any });
try {
    console.log("proxy function set length:", Reflect.set(proxySet, "length", 9));
} catch (err: any) {
    console.log("proxy function set length:", err);
}

const proxyDescriptorTarget: any = ProxyDescriptor as any;
const proxyDescriptor: any = new Proxy(proxyDescriptorTarget, { getOwnPropertyDescriptor: badDescriptor as any });
try {
    const badNameDesc: any = Reflect.getOwnPropertyDescriptor(proxyDescriptor, "name");
    console.log("proxy function desc name:", badNameDesc.value);
} catch (err: any) {
    console.log("proxy function desc name:", err);
}

const proxyMissingKeysTarget: any = ProxyKeys as any;
const proxyMissingKeys: any = new Proxy(proxyMissingKeysTarget, { ownKeys: missingKeys as any });
try {
    console.log("proxy function keys missing:", Reflect.ownKeys(proxyMissingKeys).length);
} catch (err: any) {
    console.log("proxy function keys missing:", err);
}
const proxyCompleteKeys: any = new Proxy(proxyMissingKeysTarget, { ownKeys: completeKeys as any });
console.log("proxy function keys complete:", Reflect.ownKeys(proxyCompleteKeys).length);

const proxyExtraKeysTarget: any = ProxyKeysClosed as any;
Object.preventExtensions(proxyExtraKeysTarget);
const proxyExtraKeys: any = new Proxy(proxyExtraKeysTarget, { ownKeys: extraKeys as any });
try {
    console.log("proxy function keys extra:", Reflect.ownKeys(proxyExtraKeys).length);
} catch (err: any) {
    console.log("proxy function keys extra:", err);
}

const proxyHasTarget: any = ProxyHas as any;
const proxyHas: any = new Proxy(proxyHasTarget, { has: falseHas as any });
try {
    console.log("proxy function has length:", Reflect.has(proxyHas, "length"));
} catch (err: any) {
    console.log("proxy function has length:", err);
}
console.log("proxy function has missing:", Reflect.has(proxyHas, "missing"));

const proxyDefineTarget: any = ProxyDefine as any;
const proxyDefine: any = new Proxy(proxyDefineTarget, { defineProperty: trueDefine as any });
try {
    console.log("proxy function define same:", Reflect.defineProperty(proxyDefine, "length", { value: 1, writable: false, enumerable: false, configurable: false }));
} catch (err: any) {
    console.log("proxy function define same:", err);
}
try {
    console.log("proxy function define changed:", Reflect.defineProperty(proxyDefine, "length", { value: 9 }));
} catch (err: any) {
    console.log("proxy function define changed:", err);
}

const proxyDeleteTarget: any = ProxyDelete as any;
const proxyDelete: any = new Proxy(proxyDeleteTarget, { deleteProperty: trueDelete as any });
try {
    console.log("proxy function delete length:", Reflect.deleteProperty(proxyDelete, "length"));
} catch (err: any) {
    console.log("proxy function delete length:", err);
}
console.log("proxy function delete missing:", Reflect.deleteProperty(proxyDelete, "missing"));
