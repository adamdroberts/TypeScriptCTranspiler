const arr: any = ["red", "blue"];

arr.foo = "mark";
arr.join = function () {
    return "custom:" + arr.foo;
};

console.log("read:", arr.foo, arr["foo"], Object.hasOwn(arr, "foo"), "foo" in arr, arr.propertyIsEnumerable("foo"));
console.log("keys:", Object.keys(arr).join("|"));
console.log("names:", Object.getOwnPropertyNames(arr).join("|"));

const values: any = Object.values(arr);
console.log("values:", values[0], values[2], typeof values[3]);

const entries: any = Object.entries(arr);
console.log("entries:", entries[2].join("="), entries[3][0], typeof entries[3][1]);
console.log("string:", arr.toString(), Reflect.apply(arr.toString, arr, []));

arr.toString = function () {
    return "own:" + arr.foo;
};
console.log("own string:", arr.toString(), Reflect.apply(arr.toString, arr, []));

console.log("delete:", delete arr.foo, Object.hasOwn(arr, "foo"), arr.foo);

Object.defineProperty(arr, "hidden", { value: "secret" });
const desc: any = Object.getOwnPropertyDescriptor(arr, "hidden");
console.log("hidden:", arr.hidden, Object.keys(arr).includes("hidden"), desc.enumerable, desc.configurable, desc.writable);
console.log("names2:", Object.getOwnPropertyNames(arr).join("|"));

Object.preventExtensions(arr);
console.log("extensible:", Object.isExtensible(arr), Reflect.set(arr, "extra", 1), Object.hasOwn(arr, "extra"));
