function* failWithResumedValue(): Generator<string, void, string> {
    console.log("before");
    throw (yield "ready") + "!";
}

const g = failWithResumedValue();
console.log("created");

const first = g.next("ignored");
console.log("first:", first.done, first.value);

try {
    g.next("boom");
} catch (err) {
    console.log("caught:", err);
}

const after = g.next("again");
console.log("after:", after.done, after.value);
