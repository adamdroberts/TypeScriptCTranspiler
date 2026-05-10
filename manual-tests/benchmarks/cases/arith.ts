// Arithmetic + control flow.
// Outer 1000 iterations × inner 10000 mixed adds/muls/mods.
const OUTER = 1000;
const INNER = 10000;

const t0 = Date.now();
let sum = 0;
for (let i = 0; i < OUTER; i++) {
    let acc = i;
    for (let j = 0; j < INNER; j++) {
        acc = (acc + j * 3) % 1000003;
        acc = (acc * 7 + 13) % 1000003;
    }
    sum += acc;
}
const t1 = Date.now();
console.log("BENCH:arith:" + (t1 - t0) + ":" + sum);
