// Array sort with user comparator.
// Outer 1000 × sort a 100-element pseudo-random array.
const OUTER = 1000;
const SIZE = 100;

const t0 = Date.now();
let checksum = 0;
for (let i = 0; i < OUTER; i++) {
    const arr: number[] = [];
    let seed = i + 1;
    for (let j = 0; j < SIZE; j++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        arr.push(seed % 10000);
    }
    arr.sort((a, b) => a - b);
    checksum += arr[0] + arr[SIZE - 1];
}
const t1 = Date.now();
console.log("BENCH:array_sort:" + (t1 - t0) + ":" + checksum);
