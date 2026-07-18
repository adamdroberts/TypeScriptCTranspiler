function* inner(): Generator<number, string, undefined> {
    yield 1;
    yield 2;
    return "inner done";
}

function* outer(): Generator<number, string, undefined> {
    console.log("outer before");
    yield* inner();
    console.log("outer after");
    return "outer done";
}

let joined = "";
for (const value of outer()) {
    joined = joined + value + "|";
}
console.log("for-of:", joined);

const iter = outer();
const first: any = iter.next();
const second: any = iter.next();
const third: any = iter.next();
console.log("manual:", first.value, second.value, third.done, third.value);
