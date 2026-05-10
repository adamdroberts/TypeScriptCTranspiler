// String building via + and template literals.
// Outer 1000 × inner 200 concats per iter.
const OUTER = 1000;
const INNER = 200;

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    let s = "";
    for (let j = 0; j < INNER; j++) {
        s = s + "x" + j;
    }
    total += s.length;
}
const t1 = Date.now();
console.log("BENCH:string_concat:" + (t1 - t0) + ":" + total);
