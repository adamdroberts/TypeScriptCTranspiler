interface Point {
    x: number;
}

const point: Point = { x: 3 };
const dynamicObject: any = { label: "x" };
const dynamicArray: any = [1, 2];
const dynamicText: any = "hi";
const dynamicNumber: any = 12;
const dynamicBool: any = false;
const dynamicNull: any = null;
const dynamicUndefined: any = undefined;

console.log("typed:", Object.prototype.toString.call(point));
console.log(
    "dynamic:",
    Object.prototype.toString.call(dynamicObject),
    Object.prototype.toString.call(dynamicArray),
);
console.log(
    "primitives:",
    Object.prototype.toString.call(dynamicText),
    Object.prototype.toString.call(dynamicNumber),
    Object.prototype.toString.call(dynamicBool),
);
console.log(
    "nullish:",
    Object.prototype.toString.call(dynamicNull),
    Object.prototype.toString.call(dynamicUndefined),
);
console.log(
    "static:",
    Object.prototype.toString.call([1, 2]),
    Object.prototype.toString.call("ok"),
    Object.prototype.toString.call(5),
    Object.prototype.toString.call(true),
);
