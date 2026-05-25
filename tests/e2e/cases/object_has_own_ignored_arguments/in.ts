interface Point {
    x: number;
}

let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const point: Point = { x: 1 };
const dynamicPoint: any = { alpha: 1 };

console.log("typed:", Object.hasOwn(point, "x", mark("a")));
console.log("array:", Object.hasOwn([10, 20], "1", mark("b")));
console.log("string:", Object.hasOwn("hi", "1", mark("c")));
console.log("dynamic:", Object.hasOwn(dynamicPoint, "alpha", mark("d"), mark("e")));
console.log("missing:", Object.hasOwn(dynamicPoint, "beta", mark("f")));
console.log("marks:", marks);
