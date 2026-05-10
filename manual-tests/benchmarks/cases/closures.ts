// Closure creation + invocation in a loop.
// tsc2c only does closures for arrows defined inside a function (function-scope
// captures), so the workload lives inside `runIter`.
const OUTER = 1000;
const CALLS = 5000;

function runIter(seed: number): number {
    let n = seed;
    const step = (k: number): number => {
        n = n + k;
        return n;
    };
    let acc = 0;
    for (let j = 0; j < CALLS; j++) {
        acc += step(j);
    }
    return acc;
}

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    total += runIter(i);
}
const t1 = Date.now();
console.log("BENCH:closures:" + (t1 - t0) + ":" + total);
