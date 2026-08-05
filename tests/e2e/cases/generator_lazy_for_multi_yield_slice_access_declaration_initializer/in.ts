let sliceAccessEvents: string[] = [];

function* multiYieldSliceAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").slice()[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

const receiver: any = [];
Object.defineProperty(receiver, "0", {
    enumerable: true,
    get: () => {
        sliceAccessEvents.push("slice");
        return "ok";
    },
});
receiver.length = 1;

const iterator = multiYieldSliceAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", receiver.length, sliceAccessEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", receiver.length, sliceAccessEvents.join(","), second.done, second.value);
const third: any = iterator.next(0);
console.log("third", receiver.length, sliceAccessEvents.join(","), third.done, third.value);
const done: any = iterator.next();
console.log("done", receiver.length, sliceAccessEvents.join(","), done.done, done.value);
