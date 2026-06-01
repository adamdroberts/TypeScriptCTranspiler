function* values(): Generator<number, number, undefined> {
    console.log("start");
    yield 1;
    try {
        console.log("try");
        throw "boom";
    } catch {
        console.log("catch");
    } finally {
        console.log("finally");
    }
    yield 2;
    return 3;
}

const iter = values();
console.log("before");
console.log("first", iter.next().value);
console.log("middle");
console.log("second", iter.next().value);
console.log("done", iter.next().value);
