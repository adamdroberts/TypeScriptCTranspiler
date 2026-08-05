function* multiYieldShiftAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").shift()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = [{ value: "ok" }, { value: "remaining" }];

const iterator = multiYieldShiftAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.length, second.done, second.value);
const third: any = iterator.next("value");
console.log("third", receiver.length, third.done, third.value);
const done: any = iterator.next();
console.log("done", receiver.length, done.done, done.value);
