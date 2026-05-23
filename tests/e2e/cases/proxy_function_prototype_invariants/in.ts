function Target(this: any): void {}
function Base(this: any): void {}
function SetterTarget(this: any): void {}
function OpenExtensible(this: any): void {}
function ClosedExtensible(this: any): void {}
function FakePrevent(this: any): void {}
function RealPrevent(this: any): void {}

function otherPrototype(target: any): any {
  return { marker: "other" };
}

function trueSetPrototype(target: any, proto: any): boolean {
  return true;
}

function falseIsExtensible(target: any): boolean {
  return false;
}

function trueIsExtensible(target: any): boolean {
  return true;
}

function truePreventExtensions(target: any): boolean {
  return true;
}

const baseProto: any = { marker: "base" };
const nextProto: any = { marker: "next" };

const forwardedTarget: any = Target as any;
const forwardedProxy: any = new Proxy(forwardedTarget, {});
console.log("forward default:", typeof Object.getPrototypeOf(forwardedProxy));
console.log(
  "forward set:",
  Object.setPrototypeOf(forwardedProxy, nextProto) === forwardedProxy,
  Object.getPrototypeOf(forwardedTarget).marker,
);
console.log(
  "forward ext:",
  Reflect.isExtensible(forwardedProxy),
  Reflect.preventExtensions(forwardedProxy),
  Reflect.isExtensible(forwardedTarget),
);

const closedGetTarget: any = Base as any;
Object.setPrototypeOf(closedGetTarget, baseProto);
Object.preventExtensions(closedGetTarget);
const closedGetProxy: any = new Proxy(closedGetTarget, { getPrototypeOf: otherPrototype as any });

try {
  console.log("get closed:", Object.getPrototypeOf(closedGetProxy).marker);
} catch (err: any) {
  console.log("get closed:", err);
}

const exactGetProxy: any = new Proxy(closedGetTarget, {
  getPrototypeOf: function (target: any): any {
    return baseProto;
  } as any,
});
console.log("get exact:", Object.getPrototypeOf(exactGetProxy).marker);

const closedSetTarget: any = SetterTarget as any;
Object.setPrototypeOf(closedSetTarget, baseProto);
Object.preventExtensions(closedSetTarget);
const closedSetProxy: any = new Proxy(closedSetTarget, { setPrototypeOf: trueSetPrototype as any });

try {
  console.log("set closed:", Reflect.setPrototypeOf(closedSetProxy, nextProto));
} catch (err: any) {
  console.log("set closed:", err);
}

console.log("set same:", Reflect.setPrototypeOf(closedSetProxy, baseProto));

const openExtensibleTarget: any = OpenExtensible as any;
const openExtensibleProxy: any = new Proxy(openExtensibleTarget, { isExtensible: falseIsExtensible as any });
try {
  console.log("open ext false:", Object.isExtensible(openExtensibleProxy));
} catch (err: any) {
  console.log("open ext false:", err);
}

const closedExtensibleTarget: any = ClosedExtensible as any;
Object.preventExtensions(closedExtensibleTarget);
const closedExtensibleProxy: any = new Proxy(closedExtensibleTarget, { isExtensible: trueIsExtensible as any });
try {
  console.log("closed ext true:", Reflect.isExtensible(closedExtensibleProxy));
} catch (err: any) {
  console.log("closed ext true:", err);
}

const fakePreventTarget: any = FakePrevent as any;
const fakePreventProxy: any = new Proxy(fakePreventTarget, { preventExtensions: truePreventExtensions as any });
try {
  console.log("fake prevent:", Reflect.preventExtensions(fakePreventProxy));
} catch (err: any) {
  console.log("fake prevent:", err);
}
console.log("fake still extensible:", Object.isExtensible(fakePreventTarget));

const realPreventTarget: any = RealPrevent as any;
Object.preventExtensions(realPreventTarget);
const realPreventProxy: any = new Proxy(realPreventTarget, { preventExtensions: truePreventExtensions as any });
try {
  console.log("real prevent:", Reflect.preventExtensions(realPreventProxy));
} catch (err: any) {
  console.log("real prevent:", err);
}
