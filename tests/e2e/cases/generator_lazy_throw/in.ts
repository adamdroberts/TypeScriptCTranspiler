function* failAfterFirst(): Generator<number, void, unknown> {
    console.log("start");
    yield 1;
    console.log("before throw");
    throw new Error("lazy boom");
}

const g = failAfterFirst();
console.log("created");

const first = g.next();
console.log("first:", first.done, first.value);

try {
    g.next();
} catch (err) {
    console.log("caught:", err);
}

const after = g.next();
console.log("after:", after.done, after.value);
