interface Point {
    x: number;
    y: number;
}

let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const point: Point = { x: 1, y: 2 };
const dynamicPoint: any = { alpha: 1, beta: 2 };

console.log("typed:", Object.getOwnPropertyNames(point, mark("a")).join("|"));
console.log("array:", Object.getOwnPropertyNames([10, 20], mark("b")).join("|"));
console.log("string:", Object.getOwnPropertyNames("hi", mark("c")).join("|"));
console.log("dynamic:", Object.getOwnPropertyNames(dynamicPoint, mark("d"), mark("e")).join("|"));
console.log("marks:", marks);
