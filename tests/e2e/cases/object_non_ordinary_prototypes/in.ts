const arrayProto: any = [10, 20, 30];
arrayProto.marker = "array-marker";
const arrayChild: any = {};
Object.setPrototypeOf(arrayChild, arrayProto);

console.log("array get:", Reflect.get(arrayChild, "length"));
console.log("array has:", "length" in arrayChild);
console.log("array set:", Reflect.set(arrayChild, "fresh", "child-marker"), arrayChild.fresh, Object.hasOwn(arrayChild, "fresh"));

function baseFunction(): void {
}
const functionChild: any = {};
Object.setPrototypeOf(functionChild, baseFunction);

console.log("function get:", typeof functionChild.prototype, functionChild.name);
console.log("function has:", "prototype" in functionChild, "name" in functionChild);
console.log("function set:", Reflect.set(functionChild, "fresh", "fn-child"), functionChild.fresh, Object.hasOwn(functionChild, "fresh"));
