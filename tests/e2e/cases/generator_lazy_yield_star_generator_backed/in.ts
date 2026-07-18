function* inner(): Generator<number, string, undefined> {
    yield 3;
    yield 4;
    return "inner done";
}

function* outer(): Generator<number, string, undefined> {
    console.log("lazy before");
    yield* inner();
    console.log("lazy after");
    return "outer done";
}

const iter = outer();
console.log("created");
const first: any = iter.next();
console.log("first:", first.done, first.value);
const second: any = iter.next();
console.log("second:", second.done, second.value);
const third: any = iter.next();
console.log("third:", third.done, third.value);
