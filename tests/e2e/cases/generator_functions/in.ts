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

try {
    range(0, 0).throw("boom");
} catch (e) {
    console.log("throw:", e);
}
