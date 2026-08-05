function* multiYieldWithAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").with(yield "index", yield "value")[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = ["a", "b"];
const iterator = multiYieldWithAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver[0], receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver[0], receiver.length, second.done, second.value);
const third: any = iterator.next(0);
console.log("third", receiver[0], receiver.length, third.done, third.value);
const fourth: any = iterator.next("x");
console.log("fourth", receiver[0], receiver.length, fourth.done, fourth.value);
receiver[0] = "changed";
const fifth: any = iterator.next(0);
console.log("fifth", receiver[0], receiver.length, fifth.done, fifth.value);
const done: any = iterator.next();
console.log("done", receiver[0], receiver.length, done.done, done.value);
