function* lazyGen1(): Generator<number, string, undefined> {
    console.log("G1 - starting generator");
    yield 10;
    console.log("G1 - yielded 10");
    yield 20;
    console.log("G1 - yielded 20");
    yield 30;
    console.log("G1 - yielded 30");
    return "lazyDone";
}

function* lazyGen2(): Generator<number, string, undefined> {
    console.log("G2 - starting generator");
    yield 10;
    console.log("G2 - yielded 10");
    yield 20;
    console.log("G2 - yielded 20");
    yield 30;
    console.log("G2 - yielded 30");
    return "lazyDone";
}

function* lazyGen3(): Generator<number, string, undefined> {
    console.log("G3 - starting generator");
    yield 10;
    console.log("G3 - yielded 10");
    yield 20;
    console.log("G3 - yielded 20");
    yield 30;
    console.log("G3 - yielded 30");
    return "lazyDone";
}

console.log("--- 1. Verification of Lazy Initialization ---");
const g1 = lazyGen1();
console.log("Generator G1 initialized without executing body");

console.log("--- 2. Stepping through next() ---");
const step1 = g1.next();
console.log("Step 1 done:", step1.done, "value:", step1.value);

const step2 = g1.next();
console.log("Step 2 done:", step2.done, "value:", step2.value);

console.log("--- 3. Materializing the rest with an array method (map) ---");
const mapped = (g1 as any).map((x: number) => x * 2);
console.log("Mapped results:", mapped.join(", "));

console.log("--- 4. Checking completed state and return value ---");
const step3 = g1.next();
console.log("Step 3 done:", step3.done, "value:", step3.value);

console.log("--- 5. for-of loop materialization ---");
const g2 = lazyGen2();
console.log("G2 initialized");
const results: number[] = [];
for (const val of g2) {
    results.push(val);
}
console.log("Loop values:", results.join(", "));

console.log("--- 6. Dynamic next() call ---");
const g3: any = lazyGen3();
console.log("G3 initialized");
const dynStep1 = g3.next();
console.log("Dyn step 1 done:", dynStep1.done, "value:", dynStep1.value);
