function* multiYieldToSplicedAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").toSpliced(0, yield "delete")[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = ["first", "second", "third"];
const iterator = multiYieldToSplicedAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver[0], receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver[0], receiver.length, second.done, second.value);
const third: any = iterator.next(1);
console.log("third", receiver[0], receiver.length, third.done, third.value);
receiver[0] = "changed";
const fourth: any = iterator.next(0);
console.log("fourth", receiver[0], receiver.length, fourth.done, fourth.value);
const done: any = iterator.next();
console.log("done", receiver[0], receiver.length, done.done, done.value);
