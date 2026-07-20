function* inner(): Generator<string, string, string> {
    yield "inner-yield";
    return "inner-return";
}

function* outer(): Generator<string, string, string> {
    const result = yield* inner();
    return "outer:" + result;
}

const iter = outer();
const first: any = iter.next("ignored");
console.log("first", first.done, first.value);
const second: any = iter.next("resume");
console.log("second", second.done, second.value);
