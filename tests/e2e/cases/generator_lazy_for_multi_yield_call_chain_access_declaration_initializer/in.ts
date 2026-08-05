function* multiYieldCallChainAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").pop().pop()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = [[{ value: "ok" }]];
const inner: any = receiver[0];
const iterator = multiYieldCallChainAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.length, inner.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.length, inner.length, second.done, second.value);
const third: any = iterator.next("value");
console.log("third", receiver.length, inner.length, third.done, third.value);
const done: any = iterator.next();
console.log("done", receiver.length, inner.length, done.done, done.value);
