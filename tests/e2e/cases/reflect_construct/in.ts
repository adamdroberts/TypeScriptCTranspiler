class Point {
    x: number;
    label: string;

    constructor(x: number, label: string) {
        this.x = x;
        this.label = label;
    }

    describe(): string {
        return this.label + ":" + this.x;
    }
}

class Empty {
    value: number;

    constructor() {
        this.value = 42;
    }
}

class Sum {
    value: number;

    constructor(a: number, b: number) {
        this.value = a + b;
    }
}

const p: Point = Reflect.construct(Point, [7, "p"]);
const e: Empty = Reflect.construct(Empty, []);
const pArgs: any = [11, "q"];
const sArgs = [2, 5];
const p2: Point = Reflect.construct(Point, pArgs);
const s: Sum = Reflect.construct(Sum, sArgs);
const pointTail = ["r"];
const dynamicPointTail: any = ["s"];
const sumTail = [9];
const p3: Point = Reflect.construct(Point, [13, ...pointTail]);
const p4: Point = Reflect.construct(Point, [17, ...dynamicPointTail]);
const s2: Sum = Reflect.construct(Sum, [4, ...sumTail]);

console.log("point:", p.describe(), p instanceof Point);
console.log("empty:", e.value, e instanceof Empty);
console.log("point args:", p2.describe(), p2 instanceof Point);
console.log("sum args:", s.value, s instanceof Sum);
console.log("point spread:", p3.describe(), p3 instanceof Point);
console.log("point dynamic spread:", p4.describe(), p4 instanceof Point);
console.log("sum spread:", s2.value, s2 instanceof Sum);
