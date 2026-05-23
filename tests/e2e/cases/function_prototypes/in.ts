function Target(this: any): void {}
function Other(this: any): void {}

const fn: any = Target as any;
const other: any = Other as any;
const defaultProto: any = Object.getPrototypeOf(fn);
const customProto: any = { marker: "fn" };
const otherProto: any = { marker: "other" };

console.log("default:", typeof defaultProto, Object.is(defaultProto, Object.getPrototypeOf(other)));
console.log("set object:", Object.setPrototypeOf(fn, customProto) === fn, Object.getPrototypeOf(fn).marker);
console.log("reflect get:", Reflect.getPrototypeOf(fn).marker);
console.log("reflect set null:", Reflect.setPrototypeOf(fn, null), Object.getPrototypeOf(fn));
console.log("ext before:", Reflect.isExtensible(fn));
console.log("prevent:", Reflect.preventExtensions(fn), Reflect.isExtensible(fn));
console.log("locked same:", Reflect.setPrototypeOf(fn, null));
console.log("locked change:", Reflect.setPrototypeOf(fn, otherProto));

try {
  console.log("object locked change:", Object.setPrototypeOf(fn, otherProto) === fn);
} catch (err: any) {
  console.log("object locked change:", err);
}
