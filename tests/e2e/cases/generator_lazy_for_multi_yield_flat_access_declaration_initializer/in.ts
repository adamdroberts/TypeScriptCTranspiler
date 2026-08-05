function* multiYieldFlatAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").flat()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = [["first"], "second"];
const iterator = multiYieldFlatAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver[0][0], receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver[0][0], receiver.length, second.done, second.value);
const third: any = iterator.next(0);
console.log("third", receiver[0][0], receiver.length, third.done, third.value);
const done: any = iterator.next();
console.log("done", receiver[0][0], receiver.length, done.done, done.value);
