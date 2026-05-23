function Target(this: any): void {}
function Base(this: any): void {}
function SetterTarget(this: any): void {}

function otherPrototype(target: any): any {
  return { marker: "other" };
}

function trueSetPrototype(target: any, proto: any): boolean {
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
