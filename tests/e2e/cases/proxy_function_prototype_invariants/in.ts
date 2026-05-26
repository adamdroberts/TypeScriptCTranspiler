function Target(this: any): void {}
function Base(this: any): void {}
function SetterTarget(this: any): void {}
function OpenExtensible(this: any): void {}
function ClosedExtensible(this: any): void {}
function FakePrevent(this: any): void {}
function RealPrevent(this: any): void {}
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
console.log("events:", events.join("|"));
