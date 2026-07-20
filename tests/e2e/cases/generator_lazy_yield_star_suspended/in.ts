const events: string[] = [];

function* inner(): Generator<string, string, string> {
    events.push("inner-start");
    const first = yield "one";
    events.push("inner-resume:" + first);
    const second = yield "two";
    events.push("inner-resume:" + second);
    return "inner-done";
}

function* outer(): Generator<string, string, string> {
    events.push("outer-start");
    yield* inner();
    events.push("outer-after");
    return "outer-done";
}

const iter = outer();
console.log("created", events.join("|"));
const first: any = iter.next("ignored");
console.log("first", first.done, first.value, events.join("|"));
const second: any = iter.next("alpha");
console.log("second", second.done, second.value, events.join("|"));
const third: any = iter.next("beta");
console.log("third", third.done, third.value, events.join("|"));
