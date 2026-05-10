// Set<number> add / has across 500 elements.
// Outer 1000 × full add+has cycle.
const OUTER = 1000;
const N = 500;

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    const s = new Set<number>();
    for (let j = 0; j < N; j++) {
        s.add(j);
        s.add(j);
    }
    for (let j = 0; j < N; j++) {
        if (s.has(j)) total += 1;
    }
    total += s.size;
}
const t1 = Date.now();
console.log("BENCH:set_ops:" + (t1 - t0) + ":" + total);
