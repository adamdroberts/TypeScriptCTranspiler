const first: any = ["first"];
const second: any = ["second"];
const defaultProto: any = Object.getPrototypeOf(first);
const customProto: any = { marker: "custom" };
const otherProto: any = { marker: "other" };

console.log("default:", typeof defaultProto, Object.is(defaultProto, Object.getPrototypeOf(second)));
console.log("set object:", Object.setPrototypeOf(first, customProto) === first, Object.getPrototypeOf(first).marker);
console.log("reflect get:", Reflect.getPrototypeOf(first).marker);
console.log("second unchanged:", Object.is(Object.getPrototypeOf(second), defaultProto));
console.log("set null:", Reflect.setPrototypeOf(first, null), Object.getPrototypeOf(first));
Object.preventExtensions(first);
console.log("locked same:", Reflect.setPrototypeOf(first, null));
console.log("locked change:", Reflect.setPrototypeOf(first, otherProto));
try {
    console.log("object locked change:", Object.setPrototypeOf(first, otherProto) === first);
} catch (err: any) {
    console.log("object locked change:", err);
}
