let stableComputedMemberEvents: string[] = [];

function* multiYieldStableComputedMemberAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")["outer"][yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = {};
const inner: any = { value: "ok" };
Object.defineProperty(receiver, "outer", {
    get: () => {
        stableComputedMemberEvents.push("outer");
        return inner;
    },
});

const iterator = multiYieldStableComputedMemberAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", stableComputedMemberEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", stableComputedMemberEvents.join(","), second.done, second.value);
const third: any = iterator.next("value");
console.log("third", stableComputedMemberEvents.join(","), third.done, third.value);
const done: any = iterator.next();
console.log("done", stableComputedMemberEvents.join(","), done.done, done.value);
