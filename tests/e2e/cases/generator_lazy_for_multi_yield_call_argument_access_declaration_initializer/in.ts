function* multiYieldCallArgumentAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").splice(0, yield "count").pop()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = [{ value: "ok" }];
const iterator = multiYieldCallArgumentAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.length, second.done, second.value);
const third: any = iterator.next(1);
console.log("third", receiver.length, third.done, third.value);
const fourth: any = iterator.next("value");
console.log("fourth", receiver.length, fourth.done, fourth.value);
const done: any = iterator.next();
console.log("done", receiver.length, done.done, done.value);
