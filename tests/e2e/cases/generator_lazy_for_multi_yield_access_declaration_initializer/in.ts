function* multiYieldAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const iterator = multiYieldAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", first.done, first.value);
const second: any = iterator.next({ answer: "ok" });
console.log("second", second.done, second.value);
const third: any = iterator.next("answer");
console.log("third", third.done, third.value);
const done: any = iterator.next();
console.log("done", done.done, done.value);
