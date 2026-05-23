interface Point {
    name: string;
}

const point: Point = { name: "Ada" };
const dynamicObject: any = { label: "x" };
const dynamicArray: any = [1, "two"];
const dynamicText: any = "hi";
const dynamicNumber: any = 12.5;
const dynamicBool: any = true;

console.log("typed:", Object.prototype.toLocaleString.call(point));
console.log(
    "dynamic:",
    Object.prototype.toLocaleString.call(dynamicObject),
    Object.prototype.toLocaleString.call(dynamicArray),
);
console.log(
    "primitives:",
    Object.prototype.toLocaleString.call(dynamicText),
    Object.prototype.toLocaleString.call(dynamicNumber),
    Object.prototype.toLocaleString.call(dynamicBool),
);
console.log(
    "static:",
    Object.prototype.toLocaleString.call([1, 2]),
    Object.prototype.toLocaleString.call("ok"),
    Object.prototype.toLocaleString.call(false),
);
