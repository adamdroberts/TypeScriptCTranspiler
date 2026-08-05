let spreadEvents: string[] = [];

function* multiYieldConcatSpreadAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").concat(...(yield "items")).pop()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = [{ value: "original" }];
const inserted: any = { value: "inserted" };
const items: any = [inserted];
Object.defineProperty(items, "0", {
    get: () => {
        spreadEvents.push("spread");
        return inserted;
    },
});

const iterator = multiYieldConcatSpreadAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", spreadEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", spreadEvents.join(","), second.done, second.value);
const third: any = iterator.next(items);
console.log("third", spreadEvents.join(","), third.done, third.value);
const fourth: any = iterator.next("value");
console.log("fourth", spreadEvents.join(","), fourth.done, fourth.value);
const done: any = iterator.next();
console.log("done", spreadEvents.join(","), done.done, done.value);
