function* multiYieldUnshiftMultiSpreadAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").unshift(...(yield "first-items"), ...(yield "second-items"))[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + typeof value;
    }
    return "done";
}

const receiver: any = ["first"];
const firstItems: any = ["one"];
const secondItems: any = ["two", "three"];
const iterator = multiYieldUnshiftMultiSpreadAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.join(","), second.done, second.value);
const third: any = iterator.next(firstItems);
console.log("third", receiver.join(","), third.done, third.value);
const fourth: any = iterator.next(secondItems);
console.log("fourth", receiver.join(","), fourth.done, fourth.value);
const fifth: any = iterator.next("missing");
console.log("fifth", receiver.join(","), fifth.done, fifth.value);
const done: any = iterator.next();
console.log("done", receiver.join(","), done.done, done.value);
