// Recursive fib(20). Outer 1000 × fib(20) → ~22M calls total.
const OUTER = 1000;

function fib(n: number): number {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    total += fib(24);
}
const t1 = Date.now();
console.log("BENCH:recursion:" + (t1 - t0) + ":" + total);
