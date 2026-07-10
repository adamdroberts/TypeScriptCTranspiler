const r: any = Reflect;
const obj: any = { x: 1 };

console.log("identity:", Reflect === r, typeof r, typeof r.get, Object.keys(r).length);
console.log("get-has:", r.get(obj, "x"), r.has(obj, "x"), r.has([], "hasOwnProperty"));
console.log("own:", r.ownKeys(obj).join("|"), r.getOwnPropertyDescriptor(obj, "x").value);
console.log("set-delete:", r.set(obj, "y", 2), obj.y, r.deleteProperty(obj, "y"), r.has(obj, "y"));
console.log("extensible:", r.isExtensible(obj), r.preventExtensions(obj), r.isExtensible(obj));

function add(a: number, b: number): number {
    return a + b;
}

const apply: any = r.apply;
console.log("metadata:", apply.name, apply.length, Object.hasOwn(apply, "prototype"), r.get.name, r.get.length, Object.hasOwn(r.get, "prototype"));
try {
    Reflect.construct(apply, []);
    console.log("construct:", "ok");
} catch (err: any) {
    console.log("construct:", err);
}
console.log("apply:", apply(add, undefined, [2, 3]));
