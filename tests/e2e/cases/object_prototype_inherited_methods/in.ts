const obj: any = { own: 1 };
const arr: any = [7];
function fn(): void {}
const fnAny: any = fn;

console.log("types:", typeof obj.hasOwnProperty, typeof obj.propertyIsEnumerable, typeof obj.isPrototypeOf, typeof obj.valueOf);
console.log("obj:", obj.hasOwnProperty("own"), obj.hasOwnProperty("missing"), obj.propertyIsEnumerable("own"), obj.toString(), obj.valueOf() === obj);
console.log("array:", arr.hasOwnProperty("0"), arr.hasOwnProperty("length"), arr.propertyIsEnumerable("0"), arr.propertyIsEnumerable("length"));
console.log("function:", fnAny.hasOwnProperty("length"), fnAny.hasOwnProperty("name"), fnAny.propertyIsEnumerable("length"));

const objectProto: any = Object.getPrototypeOf({});
console.log("prototype:", Object.keys(objectProto).join("|"), objectProto.propertyIsEnumerable("toString"), objectProto.isPrototypeOf(arr), objectProto.isPrototypeOf(fnAny));
console.log("has:", "hasOwnProperty" in obj, Reflect.has(arr, "hasOwnProperty"), Reflect.has(fnAny, "valueOf"));

const has = obj.hasOwnProperty;
const tag = obj.toString;
console.log("detached:", Reflect.apply(has, arr, ["0"]), Reflect.apply(tag, arr, []));
