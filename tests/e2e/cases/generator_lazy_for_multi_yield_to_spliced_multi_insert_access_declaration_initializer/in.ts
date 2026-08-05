function* multiYieldToSplicedMultiInsertAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").toSpliced(0, yield "delete", yield "insert-first", yield "insert-second")[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = ["first", "fourth"];
const iterator = multiYieldToSplicedMultiInsertAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver[0], receiver.length, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver[0], receiver.length, second.done, second.value);
const third: any = iterator.next(1);
console.log("third", receiver[0], receiver.length, third.done, third.value);
const fourth: any = iterator.next("second");
console.log("fourth", receiver[0], receiver.length, fourth.done, fourth.value);
const fifth: any = iterator.next("third");
console.log("fifth", receiver[0], receiver.length, fifth.done, fifth.value);
receiver[0] = "changed";
const sixth: any = iterator.next(1);
console.log("sixth", receiver[0], receiver.length, sixth.done, sixth.value);
const done: any = iterator.next();
console.log("done", receiver[0], receiver.length, done.done, done.value);
