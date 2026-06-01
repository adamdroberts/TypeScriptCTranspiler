const proto: any = Object.prototype;
const obj: any = {};
const arr: any = ["x"];

console.log("identity:", proto === Object.getPrototypeOf(obj), Object.getPrototypeOf(proto));
console.log("keys:", Object.keys(proto).length, Object.values(proto).length, Object.entries(proto).length);
console.log("own:", Reflect.ownKeys(proto).includes("toString"), proto.propertyIsEnumerable("toString"), Object.getOwnPropertyDescriptor(proto, "toString") !== undefined);
console.log("methods:", typeof proto.hasOwnProperty, typeof proto.toString, Reflect.apply(proto.hasOwnProperty, arr, ["length"]), Reflect.apply(proto.toString, arr, []), proto.isPrototypeOf(arr));
