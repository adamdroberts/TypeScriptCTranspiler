// Class instantiation + method dispatch + simple inheritance.
// Outer 1000 × build 500 instances and dispatch.
const OUTER = 1000;
const N = 500;

class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    dist2(): number { return this.x * this.x + this.y * this.y; }
}

class Labeled extends Point {
    label: number;
    constructor(x: number, y: number, label: number) {
        super(x, y);
        this.label = label;
    }
    weight(): number { return this.dist2() + this.label; }
}

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    let s = 0;
    for (let j = 0; j < N; j++) {
        const p = new Labeled(i + j, i - j, j);
        s += p.weight();
    }
    total += s;
}
const t1 = Date.now();
console.log("BENCH:classes:" + (t1 - t0) + ":" + total);
