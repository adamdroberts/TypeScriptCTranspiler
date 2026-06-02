function Target(this: any): void {}
function Base(this: any): void {}
function SetterTarget(this: any): void {}
function OpenExtensible(this: any): void {}
function ClosedExtensible(this: any): void {}
function FakePrevent(this: any): void {}
function RealPrevent(this: any): void {}
function MissingPrototype(this: any): void {}
function ExactFunction(this: any): void {}
function ExtraClosedFunction(this: any): void {}
function PrototypeDescriptor(this: any): void {}
function LockedPrototype(this: any): void {}
const events: string[] = [];

function mark(label: string): string {
  events.push("ignored:" + label);
  return label;
}

function otherPrototype(target: any): any {
  events.push("other proto trap");
  return { marker: "other" };
}

function trueSetPrototype(target: any, proto: any): boolean {
  events.push("set proto:" + proto.marker);
  return true;
}

function falseIsExtensible(target: any): boolean {
  events.push("is false trap");
  return false;
}

function trueIsExtensible(target: any): boolean {
  events.push("is true trap");
  return true;
}

function truePreventExtensions(target: any): boolean {
  events.push("prevent true trap");
  return true;
}

function missingPrototypeKey(target: any): string[] {
  events.push("missing prototype keys");
  return ["length", "name"];
}

function exactFunctionKeys(target: any): string[] {
  events.push("exact function keys");
  return ["length", "name", "prototype"];
}

function extraClosedFunctionKeys(target: any): string[] {
  events.push("extra closed function keys");
  return ["length", "name", "prototype", "ghost"];
}

function realFunctionDescriptor(target: any, prop: any): any {
  events.push("real function desc:" + String(prop));
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

function trueDefine(target: any, prop: any, desc: any): boolean {
  events.push("define:" + String(prop));
  return true;
}

function writablePrototypeDescriptor(target: any, prop: any): any {
  events.push("writable prototype desc:" + String(prop));
  if (prop === "prototype") {
    return { value: target.prototype, writable: true, enumerable: false, configurable: false };
  }
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

function nonWritablePrototypeDescriptor(target: any, prop: any): any {
  events.push("nonwritable prototype desc:" + String(prop));
  if (prop === "prototype") {
    return { value: target.prototype, writable: false, enumerable: false, configurable: false };
  }
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

function configurablePrototypeDescriptor(target: any, prop: any): any {
  events.push("configurable prototype desc:" + String(prop));
  if (prop === "prototype") {
    return { value: target.prototype, writable: true, enumerable: false, configurable: true };
  }
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

function hiddenPrototypeDescriptor(target: any, prop: any): any {
  events.push("hidden prototype desc:" + String(prop));
  if (prop === "prototype") {
    return undefined;
  }
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

const baseProto: any = { marker: "base" };
const nextProto: any = { marker: "next" };

const forwardedTarget: any = Target as any;
const forwardedProxy: any = new Proxy(forwardedTarget, {});
console.log("forward default:", typeof Object.getPrototypeOf(forwardedProxy, mark("forward default")));
console.log(
  "forward set:",
  Object.setPrototypeOf(forwardedProxy, nextProto, mark("forward set")) === forwardedProxy,
  Object.getPrototypeOf(forwardedTarget).marker,
);
console.log(
  "forward ext:",
  Reflect.isExtensible(forwardedProxy, mark("forward ext")),
  Reflect.preventExtensions(forwardedProxy, mark("forward prevent")),
  Reflect.isExtensible(forwardedTarget),
);

const closedGetTarget: any = Base as any;
Object.setPrototypeOf(closedGetTarget, baseProto);
Object.preventExtensions(closedGetTarget);
const closedGetProxy: any = new Proxy(closedGetTarget, { getPrototypeOf: otherPrototype as any });

try {
  console.log("get closed:", Object.getPrototypeOf(closedGetProxy, mark("get closed")).marker);
} catch (err: any) {
  console.log("get closed:", err);
}

const exactGetProxy: any = new Proxy(closedGetTarget, {
  getPrototypeOf: function (target: any): any {
    events.push("base proto trap");
    return baseProto;
  } as any,
});
console.log("get exact:", Object.getPrototypeOf(exactGetProxy, mark("get exact")).marker);

const closedSetTarget: any = SetterTarget as any;
Object.setPrototypeOf(closedSetTarget, baseProto);
Object.preventExtensions(closedSetTarget);
const closedSetProxy: any = new Proxy(closedSetTarget, { setPrototypeOf: trueSetPrototype as any });

try {
  console.log("set closed:", Reflect.setPrototypeOf(closedSetProxy, nextProto, mark("set closed")));
} catch (err: any) {
  console.log("set closed:", err);
}

console.log("set same:", Reflect.setPrototypeOf(closedSetProxy, baseProto, mark("set same")));

const openExtensibleTarget: any = OpenExtensible as any;
const openExtensibleProxy: any = new Proxy(openExtensibleTarget, { isExtensible: falseIsExtensible as any });
try {
  console.log("open ext false:", Object.isExtensible(openExtensibleProxy, mark("open ext false")));
} catch (err: any) {
  console.log("open ext false:", err);
}

const closedExtensibleTarget: any = ClosedExtensible as any;
Object.preventExtensions(closedExtensibleTarget);
const closedExtensibleProxy: any = new Proxy(closedExtensibleTarget, { isExtensible: trueIsExtensible as any });
try {
  console.log("closed ext true:", Reflect.isExtensible(closedExtensibleProxy, mark("closed ext true")));
} catch (err: any) {
  console.log("closed ext true:", err);
}

const fakePreventTarget: any = FakePrevent as any;
const fakePreventProxy: any = new Proxy(fakePreventTarget, { preventExtensions: truePreventExtensions as any });
try {
  console.log("fake prevent:", Reflect.preventExtensions(fakePreventProxy, mark("fake prevent")));
} catch (err: any) {
  console.log("fake prevent:", err);
}
console.log("fake still extensible:", Object.isExtensible(fakePreventTarget));

const realPreventTarget: any = RealPrevent as any;
Object.preventExtensions(realPreventTarget);
const realPreventProxy: any = new Proxy(realPreventTarget, { preventExtensions: truePreventExtensions as any });
try {
  console.log("real prevent:", Reflect.preventExtensions(realPreventProxy, mark("real prevent")));
} catch (err: any) {
  console.log("real prevent:", err);
}

const missingPrototypeTarget: any = MissingPrototype as any;
const missingPrototypeProxy: any = new Proxy(missingPrototypeTarget, { ownKeys: missingPrototypeKey as any });
try {
  console.log("missing prototype key:", Reflect.ownKeys(missingPrototypeProxy, mark("missing prototype key")).join(","));
} catch (err: any) {
  console.log("missing prototype key:", err);
}

const exactFunctionTarget: any = ExactFunction as any;
const exactFunctionProxy: any = new Proxy(exactFunctionTarget, { ownKeys: exactFunctionKeys as any });
console.log("exact function keys:", Reflect.ownKeys(exactFunctionProxy, mark("exact function keys")).join(","));

const extraClosedFunctionTarget: any = ExtraClosedFunction as any;
Object.preventExtensions(extraClosedFunctionTarget);
const extraClosedFunctionProxy: any = new Proxy(extraClosedFunctionTarget, { ownKeys: extraClosedFunctionKeys as any });
try {
  console.log("extra closed function keys:", Reflect.ownKeys(extraClosedFunctionProxy, mark("extra closed function keys")).join(","));
} catch (err: any) {
  console.log("extra closed function keys:", err);
}

const prototypeDescriptorTarget: any = PrototypeDescriptor as any;
const prototypeDescriptorProxy: any = new Proxy(prototypeDescriptorTarget, { getOwnPropertyDescriptor: writablePrototypeDescriptor as any });
const prototypeDesc: any = Object.getOwnPropertyDescriptor(prototypeDescriptorProxy, "prototype", mark("prototype descriptor"));
console.log(
  "prototype descriptor:",
  prototypeDesc.writable,
  prototypeDesc.enumerable,
  prototypeDesc.configurable,
  prototypeDesc.value === prototypeDescriptorTarget.prototype,
);

const prototypeDefineProxy: any = new Proxy(prototypeDescriptorTarget, { defineProperty: trueDefine as any });
try {
  console.log("prototype define downgrade:", Reflect.defineProperty(prototypeDefineProxy, "prototype", { writable: false }, mark("prototype define downgrade")));
} catch (err: any) {
  console.log("prototype define downgrade:", err);
}

const nonWritablePrototypeProxy: any = new Proxy(prototypeDescriptorTarget, { getOwnPropertyDescriptor: nonWritablePrototypeDescriptor as any });
try {
  console.log("nonwritable prototype descriptor:", Object.getOwnPropertyDescriptor(nonWritablePrototypeProxy, "prototype", mark("nonwritable prototype descriptor"))?.writable);
} catch (err: any) {
  console.log("nonwritable prototype descriptor:", err);
}

const configurablePrototypeProxy: any = new Proxy(prototypeDescriptorTarget, { getOwnPropertyDescriptor: configurablePrototypeDescriptor as any });
try {
  console.log("configurable prototype descriptor:", Reflect.getOwnPropertyDescriptor(configurablePrototypeProxy, "prototype", mark("configurable prototype descriptor"))?.configurable);
} catch (err: any) {
  console.log("configurable prototype descriptor:", err);
}

const hiddenPrototypeProxy: any = new Proxy(prototypeDescriptorTarget, { getOwnPropertyDescriptor: hiddenPrototypeDescriptor as any });
try {
  console.log("hidden prototype descriptor:", Object.getOwnPropertyDescriptor(hiddenPrototypeProxy, "prototype", mark("hidden prototype descriptor"))?.value);
} catch (err: any) {
  console.log("hidden prototype descriptor:", err);
}

const realFunctionDescriptorProxy: any = new Proxy(prototypeDescriptorTarget, { getOwnPropertyDescriptor: realFunctionDescriptor as any });
const realPrototypeDesc: any = Reflect.getOwnPropertyDescriptor(realFunctionDescriptorProxy, "prototype", mark("real prototype descriptor"));
console.log("real prototype descriptor:", realPrototypeDesc.writable, realPrototypeDesc.configurable);

const lockedPrototypeTarget: any = LockedPrototype as any;
const lockedOriginalPrototype: any = lockedPrototypeTarget.prototype;
const lockedBeforeDesc: any = Object.getOwnPropertyDescriptor(lockedPrototypeTarget, "prototype");
console.log("locked prototype before:", lockedBeforeDesc.writable, lockedBeforeDesc.configurable);
console.log(
  "locked prototype define:",
  Object.defineProperty(lockedPrototypeTarget, "prototype", { writable: false }) === lockedPrototypeTarget,
);
const lockedAfterDesc: any = Object.getOwnPropertyDescriptor(lockedPrototypeTarget, "prototype");
console.log("locked prototype after:", lockedAfterDesc.writable, lockedAfterDesc.value === lockedOriginalPrototype);
lockedPrototypeTarget.prototype = { marker: "changed" };
console.log("locked prototype assign:", lockedPrototypeTarget.prototype === lockedOriginalPrototype);
const lockedPrototypeProxy: any = new Proxy(lockedPrototypeTarget, { getOwnPropertyDescriptor: realFunctionDescriptor as any });
const lockedProxyDesc: any = Reflect.getOwnPropertyDescriptor(lockedPrototypeProxy, "prototype", mark("locked prototype descriptor"));
console.log("locked prototype proxy descriptor:", lockedProxyDesc.writable, lockedProxyDesc.value === lockedOriginalPrototype);

console.log("events:", events.join("|"));
