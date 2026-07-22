interface Point {
    x: number;
    y: number;
    z: number;
}

const p: Point = { x: 1, y: 2, z: 3 };
console.log("--- typed class ---");
for (const k in p) {
    console.log(k);
}

class BaseBox {
    width: number;
    height: number;

    constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
    }
}

class Box extends BaseBox {
    width: number;
    label: string;
    constructor(w: number, h: number, l: string) {
        super(w, h);
        this.width = w + 1;
        this.label = l;
    }
}

console.log("--- typed class instance ---");
const b = new Box(10, 20, "box");
for (const key in b) {
    console.log(key);
}

console.log("--- typed array ---");
const arr = [10, 20, 30];
for (const i in arr) {
    console.log(i);
}

console.log("--- Buffer ---");
const bytes = Buffer.from([13, 14]);
for (const i in bytes) {
    console.log(i);
}

console.log("--- dynamic object ---");
const obj = JSON.parse(`{"alpha":1,"beta":2,"gamma":3}`) as any;
for (const k in obj) {
    console.log(k, "=", obj[k]);
}

console.log("--- continue/break ---");
let collected = "";
for (const k in obj) {
    if (k === "beta") continue;
    if (k === "gamma") break;
    collected = collected + k;
}
console.log(collected);
