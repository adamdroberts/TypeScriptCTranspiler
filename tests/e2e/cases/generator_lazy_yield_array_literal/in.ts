const events: string[] = [];

function* testComprehensiveArrayYields(): Generator<any, any, any> {
    events.push("start");

    // 1. Typed array literal with yield
    const typedArr: number[] = [10, yield 1, 30];
    events.push("typed: " + typedArr.join(","));

    // 2. Untyped/dynamic array literal with yield
    const untypedArr: any[] = ["a", yield 2, "c"];
    events.push("untyped: " + untypedArr.join(","));

    // 3. Tuple/entry literal with yield
    const entryArr: [string, any] = ["key", yield 3];
    events.push("entry: " + entryArr[0] + ":" + entryArr[1]);

    // 4. Array literal with a spread element alongside yield
    const base = [100, 200];
    const spreadArr: number[] = [...base, yield 4, 300];
    events.push("spread: " + spreadArr.join(","));

    // 5. Assignment RHS
    let assigned: number[] = [];
    assigned = [40, yield 5, 60];
    events.push("assigned: " + assigned.join(","));

    // 6. Return expression
    return [70, yield 6, 90];
}

const g = testComprehensiveArrayYields();
console.log("Init");

// Step 1: execute up to first yield
const r1 = g.next("ignored_first");
console.log("R1:", r1.done, r1.value); // Should yield 1

// Step 2: resume with 20, execute up to second yield
const r2 = g.next(20);
console.log("R2:", r2.done, r2.value); // Should yield 2

// Step 3: resume with "b", execute up to third yield
const r3 = g.next("b");
console.log("R3:", r3.done, r3.value); // Should yield 3

// Step 4: resume with "val", execute up to fourth yield
const r4 = g.next("val");
console.log("R4:", r4.done, r4.value); // Should yield 4

// Step 5: resume with 250, execute up to fifth yield
const r5 = g.next(250);
console.log("R5:", r5.done, r5.value); // Should yield 5

// Step 6: resume with 50, execute up to sixth yield
const r6 = g.next(50);
console.log("R6:", r6.done, r6.value); // Should yield 6

// Step 7: resume with 80, execute to the end
const r7 = g.next(80);
console.log("R7:", r7.done, r7.value.join(",")); // Should return [70, 80, 90]

console.log("Events:", events.join(" | "));
