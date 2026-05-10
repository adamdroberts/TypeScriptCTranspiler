// Array allocation + push + indexed read.
// Outer 1000 × build a 2000-element array, sum via index.
const OUTER = 1000;
const INNER = 2000;

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    const arr: number[] = [];
    for (let j = 0; j < INNER; j++) {
        arr.push(j + i);
    }
    let s = 0;
    for (let j = 0; j < arr.length; j++) {
        s += arr[j];
    }
    total += s;
}
const t1 = Date.now();
console.log("BENCH:array_alloc:" + (t1 - t0) + ":" + total);
