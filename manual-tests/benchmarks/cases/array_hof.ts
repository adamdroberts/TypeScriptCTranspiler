// map / filter / reduce on a 1000-element array.
// Outer 1000 × full chain.
const OUTER = 1000;
const SIZE = 1000;

const base: number[] = [];
for (let j = 0; j < SIZE; j++) base.push(j);

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    const out = base
        .map((n) => n * 2 + i)
        .filter((n) => n % 3 !== 0)
        .reduce((acc, n) => acc + n, 0);
    total += out;
}
const t1 = Date.now();
console.log("BENCH:array_hof:" + (t1 - t0) + ":" + total);
