interface Point {
    x: number;
    name: string;
}

const point: Point = { x: 7, name: "Ada" };
const dynamic: any = { own: 1 };
const nums = [10, 20];
const text = "hi";
const data = Buffer.from("ab");

console.log(
    "typed:",
    Object.prototype.hasOwnProperty.call(point, "x"),
    Object.prototype.propertyIsEnumerable.call(point, "name"),
    Object.prototype.hasOwnProperty.call(point, "missing"),
);
console.log(
    "dynamic:",
    Object.prototype.hasOwnProperty.call(dynamic, "own"),
    Object.prototype.propertyIsEnumerable.call(dynamic, "own"),
);
console.log(
    "array:",
    Object.prototype.hasOwnProperty.call(nums, "1"),
    Object.prototype.propertyIsEnumerable.call(nums, "length"),
);
console.log(
    "string:",
    Object.prototype.hasOwnProperty.call(text, "1"),
    Object.prototype.propertyIsEnumerable.call(text, "length"),
);
console.log(
    "buffer:",
    Object.prototype.hasOwnProperty.call(data, "0"),
    Object.prototype.propertyIsEnumerable.call(data, "length"),
);
console.log(
    "primitive:",
    Object.prototype.hasOwnProperty.call(12, "toString"),
    Object.prototype.propertyIsEnumerable.call(false, "valueOf"),
);
