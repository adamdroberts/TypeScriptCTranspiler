// Map<string, number> set / get / has across 200 keys.
// Outer 1000 × full set+get+has cycle.
const OUTER = 1000;
const KEYS = 200;

const keys: string[] = [];
for (let j = 0; j < KEYS; j++) keys.push("key_" + j);

const t0 = Date.now();
let total = 0;
for (let i = 0; i < OUTER; i++) {
    const m = new Map<string, number>();
    for (let j = 0; j < KEYS; j++) {
        m.set(keys[j], j + i);
    }
    for (let j = 0; j < KEYS; j++) {
        total += m.get(keys[j]) ?? 0;
        if (m.has(keys[j])) total += 1;
    }
}
const t1 = Date.now();
console.log("BENCH:map_ops:" + (t1 - t0) + ":" + total);
