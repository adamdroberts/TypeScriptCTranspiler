function* multiYieldUnshiftMixedSpreadAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").unshift(yield "first-item", ...(yield "spread-items"), yield "last-item")[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + typeof value;
    }
    return "done";
}

const receiver: any = ["first"];
const spreadItems: any = ["spread-one", "spread-two"];
const iterator = multiYieldUnshiftMixedSpreadAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.join(","), second.done, second.value);
const third: any = iterator.next("direct-one");
console.log("third", receiver.join(","), third.done, third.value);
const fourth: any = iterator.next(spreadItems);
console.log("fourth", receiver.join(","), fourth.done, fourth.value);
const fifth: any = iterator.next("direct-two");
console.log("fifth", receiver.join(","), fifth.done, fifth.value);
const sixth: any = iterator.next("missing");
console.log("sixth", receiver.join(","), sixth.done, sixth.value);
const done: any = iterator.next();
console.log("done", receiver.join(","), done.done, done.value);
