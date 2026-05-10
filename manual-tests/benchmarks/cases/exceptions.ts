// try / throw / catch in a tight loop.
// Outer 1000 × throw + catch 100 times.
const OUTER = 1000;
const N = 100;

function maybeThrow(j: number): number {
    if ((j & 1) === 1) throw "odd:" + j;
    return j;
}

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    for (let j = 0; j < N; j++) {
        try {
            total += maybeThrow(j);
        } catch (e) {
            total += 1;
        }
    }
}
const t1 = Date.now();
console.log("BENCH:exceptions:" + (t1 - t0) + ":" + total);
