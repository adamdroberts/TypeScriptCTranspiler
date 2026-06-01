function Tool(this: any, left: number, right: number): void {}

const fn: any = Tool as any;
fn.extra = "mark";
fn.count = 2;

console.log("read:", fn.extra, fn["extra"], Object.hasOwn(fn, "extra"), "extra" in fn, fn.propertyIsEnumerable("extra"));
console.log("keys:", Object.keys(fn).join("|"));
console.log("names:", Object.getOwnPropertyNames(fn).join("|"));

const values: any = Object.values(fn);
console.log("values:", values.join("|"));

const entries: any = Object.entries(fn);
console.log("entries:", entries[0].join("="), entries[1].join("="));

const desc: any = Object.getOwnPropertyDescriptor(fn, "extra");
console.log("desc:", desc.value, desc.writable, desc.enumerable, desc.configurable);
console.log("delete:", delete fn.extra, Object.hasOwn(fn, "extra"), fn.extra);

function Target(this: any): void {}
const target: any = Target as any;
Object.assign(target, { a: 1, b: 2 });
console.log("assign:", target.a, target.b, Object.keys(target).join("|"));

const assignedFrom: any = Object.assign({}, target);
console.log("assign source:", assignedFrom.a, assignedFrom.b, Object.keys(assignedFrom).join("|"));

function Hidden(this: any): void {}
const hidden: any = Hidden as any;
Object.defineProperty(hidden, "secret", { value: "s" });
const hiddenDesc: any = Object.getOwnPropertyDescriptor(hidden, "secret");
console.log("hidden:", hidden.secret, Object.keys(hidden).includes("secret"), hiddenDesc.enumerable, hiddenDesc.configurable, hiddenDesc.writable, Object.getOwnPropertyNames(hidden).join("|"));

function Frozen(this: any): void {}
const frozen: any = Frozen as any;
frozen.x = 1;
Object.freeze(frozen);
console.log("freeze:", Object.isExtensible(frozen), Object.isSealed(frozen), Object.isFrozen(frozen), Reflect.set(frozen, "x", 2), frozen.x, Reflect.deleteProperty(frozen, "x"));

function Closed(this: any): void {}
const closed: any = Closed as any;
Object.preventExtensions(closed);
console.log("closed:", Object.isExtensible(closed), Reflect.set(closed, "later", 1), Object.hasOwn(closed, "later"));
