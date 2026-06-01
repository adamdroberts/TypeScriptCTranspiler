function ConfigurableGet(this: any): void {}
function FixedGet(this: any): void {}
function ConfigurableSet(this: any): void {}
function FixedSet(this: any): void {}
function ConfigurableDescriptor(this: any): void {}
function ConfigurableDefine(this: any): void {}
function ConfigurableDelete(this: any): void {}
function ClosedDelete(this: any): void {}
function ClosedHas(this: any): void {}
function MissingClosedKeys(this: any): void {}
function ExactClosedKeys(this: any): void {}
function ExtraClosedKeys(this: any): void {}
function MissingFixedKeys(this: any): void {}

function fakeGet(target: any, prop: any, receiver: any): any {
  if (prop === "cfg" || prop === "fixed") return "fake";
  return Reflect.get(target, prop, receiver);
}

function trueSet(target: any, prop: any, value: any, receiver: any): boolean {
  return true;
}

function hideCfg(target: any, prop: any): any {
  if (prop === "cfg") return undefined;
  return Reflect.getOwnPropertyDescriptor(target, prop);
}

function trueDefine(target: any, prop: any, desc: any): boolean {
  return true;
}

function trueDelete(target: any, prop: any): boolean {
  return true;
}

function falseHas(target: any, prop: any): boolean {
  return false;
}

function metadataOnlyKeys(target: any): string[] {
  return ["length", "name", "prototype"];
}

function sideKeys(target: any): string[] {
  return ["length", "name", "prototype", "side"];
}

function extraSideKeys(target: any): string[] {
  return ["length", "name", "prototype", "side", "ghost"];
}

const configurableGetTarget: any = ConfigurableGet as any;
Object.defineProperty(configurableGetTarget, "cfg", {
  value: "cfg",
  writable: false,
  enumerable: true,
  configurable: true,
});
const configurableGetProxy: any = new Proxy(configurableGetTarget, { get: fakeGet as any });
console.log("cfg get:", Reflect.get(configurableGetProxy, "cfg"));

const fixedGetTarget: any = FixedGet as any;
Object.defineProperty(fixedGetTarget, "fixed", {
  value: "fixed",
  writable: false,
  enumerable: true,
  configurable: false,
});
const fixedGetProxy: any = new Proxy(fixedGetTarget, { get: fakeGet as any });
try {
  console.log("fixed get:", Reflect.get(fixedGetProxy, "fixed"));
} catch (err: any) {
  console.log("fixed get:", err);
}

const configurableSetTarget: any = ConfigurableSet as any;
Object.defineProperty(configurableSetTarget, "cfg", {
  value: "cfg",
  writable: false,
  enumerable: true,
  configurable: true,
});
const configurableSetProxy: any = new Proxy(configurableSetTarget, { set: trueSet as any });
console.log("cfg set:", Reflect.set(configurableSetProxy, "cfg", "fake"));

const fixedSetTarget: any = FixedSet as any;
Object.defineProperty(fixedSetTarget, "fixed", {
  value: "fixed",
  writable: false,
  enumerable: true,
  configurable: false,
});
const fixedSetProxy: any = new Proxy(fixedSetTarget, { set: trueSet as any });
try {
  console.log("fixed set:", Reflect.set(fixedSetProxy, "fixed", "fake"));
} catch (err: any) {
  console.log("fixed set:", err);
}

const configurableDescriptorTarget: any = ConfigurableDescriptor as any;
Object.defineProperty(configurableDescriptorTarget, "cfg", {
  value: "cfg",
  writable: false,
  enumerable: true,
  configurable: true,
});
const configurableDescriptorProxy: any = new Proxy(configurableDescriptorTarget, { getOwnPropertyDescriptor: hideCfg as any });
console.log("cfg hidden desc:", Reflect.getOwnPropertyDescriptor(configurableDescriptorProxy, "cfg") === undefined);
Object.preventExtensions(configurableDescriptorTarget);
try {
  console.log("cfg hidden closed desc:", Reflect.getOwnPropertyDescriptor(configurableDescriptorProxy, "cfg") === undefined);
} catch (err: any) {
  console.log("cfg hidden closed desc:", err);
}

const configurableDefineTarget: any = ConfigurableDefine as any;
Object.defineProperty(configurableDefineTarget, "cfg", {
  value: "cfg",
  writable: true,
  enumerable: true,
  configurable: true,
});
const configurableDefineProxy: any = new Proxy(configurableDefineTarget, { defineProperty: trueDefine as any });
try {
  console.log("cfg define nonconfig:", Reflect.defineProperty(configurableDefineProxy, "cfg", { value: "next", configurable: false }));
} catch (err: any) {
  console.log("cfg define nonconfig:", err);
}

const configurableDeleteTarget: any = ConfigurableDelete as any;
configurableDeleteTarget.cfg = "cfg";
const configurableDeleteProxy: any = new Proxy(configurableDeleteTarget, { deleteProperty: trueDelete as any });
console.log("cfg delete open:", Reflect.deleteProperty(configurableDeleteProxy, "cfg"));

const closedDeleteTarget: any = ClosedDelete as any;
closedDeleteTarget.side = "side";
Object.preventExtensions(closedDeleteTarget);
const closedDeleteProxy: any = new Proxy(closedDeleteTarget, { deleteProperty: trueDelete as any });
try {
  console.log("side delete closed:", Reflect.deleteProperty(closedDeleteProxy, "side"));
} catch (err: any) {
  console.log("side delete closed:", err);
}

const closedHasTarget: any = ClosedHas as any;
closedHasTarget.side = "side";
Object.preventExtensions(closedHasTarget);
const closedHasProxy: any = new Proxy(closedHasTarget, { has: falseHas as any });
try {
  console.log("side has closed:", Reflect.has(closedHasProxy, "side"));
} catch (err: any) {
  console.log("side has closed:", err);
}

const missingClosedKeysTarget: any = MissingClosedKeys as any;
missingClosedKeysTarget.side = "side";
Object.preventExtensions(missingClosedKeysTarget);
const missingClosedKeysProxy: any = new Proxy(missingClosedKeysTarget, { ownKeys: metadataOnlyKeys as any });
try {
  console.log("side keys missing:", Reflect.ownKeys(missingClosedKeysProxy).join(","));
} catch (err: any) {
  console.log("side keys missing:", err);
}

const exactClosedKeysTarget: any = ExactClosedKeys as any;
exactClosedKeysTarget.side = "side";
Object.preventExtensions(exactClosedKeysTarget);
const exactClosedKeysProxy: any = new Proxy(exactClosedKeysTarget, { ownKeys: sideKeys as any });
console.log("side keys exact:", Reflect.ownKeys(exactClosedKeysProxy).join(","));

const extraClosedKeysTarget: any = ExtraClosedKeys as any;
extraClosedKeysTarget.side = "side";
Object.preventExtensions(extraClosedKeysTarget);
const extraClosedKeysProxy: any = new Proxy(extraClosedKeysTarget, { ownKeys: extraSideKeys as any });
try {
  console.log("side keys extra:", Reflect.ownKeys(extraClosedKeysProxy).join(","));
} catch (err: any) {
  console.log("side keys extra:", err);
}

const missingFixedKeysTarget: any = MissingFixedKeys as any;
Object.defineProperty(missingFixedKeysTarget, "fixed", {
  value: "fixed",
  writable: true,
  enumerable: true,
  configurable: false,
});
const missingFixedKeysProxy: any = new Proxy(missingFixedKeysTarget, { ownKeys: metadataOnlyKeys as any });
try {
  console.log("fixed keys missing:", Reflect.ownKeys(missingFixedKeysProxy).join(","));
} catch (err: any) {
  console.log("fixed keys missing:", err);
}
