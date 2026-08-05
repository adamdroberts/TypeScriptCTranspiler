function* multiYieldPushSpreadAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").push(...(yield "items"))[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + typeof value;
    }
    return "done";
}

const receiver: any = ["first"];
const items: any = ["inserted"];
const iterator = multiYieldPushSpreadAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver[0], receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver[0], receiver.length, second.done, second.value);
const third: any = iterator.next(items);
console.log("third", receiver[0], receiver[1], receiver.length, third.done, third.value);
const fourth: any = iterator.next("missing");
console.log("fourth", receiver[0], receiver[1], receiver.length, fourth.done, fourth.value);
const done: any = iterator.next();
console.log("done", receiver[0], receiver[1], receiver.length, done.done, done.value);
