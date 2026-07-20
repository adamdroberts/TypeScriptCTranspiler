function* range(start: number, end: number): Generator<number, string, undefined> {
    yield* [start, start + 1];
    for (let n = start + 2; n <= end; n++) {
        yield n;
    }
    return "done";
}

function* labels(): Generator<string, string, undefined> {
    yield* ["alpha", "beta"];
    yield* "!";
    return "done";
}

function* nodeSources(): Generator<any, string, undefined> {
    try {
        const params = new URLSearchParams("a=1&b=two");
        yield* params;
        const bytes = Buffer.from([13, 14]);
        yield* bytes as any;
    } catch (error) {
        yield "fallback";
    }
    return "node-sources-done";
}

const nums: number[] = [];
for (const n of range(2, 5)) {
    nums.push(n);
}

const words: string[] = [];
for (const label of labels()) {
    words.push(label);
}

console.log("range:", nums.join(","));
console.log("labels:", words.join("|"));

const nodeValues: any[] = [];
for (const value of nodeSources()) {
    nodeValues.push(value);
}
console.log("node sources:", nodeValues.map((value: any) => Array.isArray(value) ? value.join(",") : value).join("|"));

const manual = range(7, 8);
const first: any = manual.next();
const second: any = manual.next();
const third: any = manual.next();
console.log("next:", first.done, first.value, second.done, second.value, third.done, String(third.value));

const closer = range(1, 3);
console.log("close first:", (closer.next() as any).value);
const closed: any = closer.return("stop");
const afterClosed: any = closer.next();
console.log("return:", closed.done, closed.value, afterClosed.done, String(afterClosed.value));

const throwEvents: string[] = [];
function markThrow(label: string): undefined {
    throwEvents.push(label);
}

try {
    range(0, 0).throw("boom", markThrow("throw-extra"));
} catch (e) {
    console.log("throw:", e);
}
console.log("throw events:", throwEvents.join("|"));
