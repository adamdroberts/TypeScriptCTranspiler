let computedMemberEvents: string[] = [];

function* multiYieldComputedMemberAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")[yield "outer-key"][yield "inner-key"],
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
        computedMemberEvents.push("outer");
        return inner;
    },
});

const iterator = multiYieldComputedMemberAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", computedMemberEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", computedMemberEvents.join(","), second.done, second.value);
const third: any = iterator.next("outer");
console.log("third", computedMemberEvents.join(","), third.done, third.value);
const fourth: any = iterator.next("value");
console.log("fourth", computedMemberEvents.join(","), fourth.done, fourth.value);
const done: any = iterator.next();
console.log("done", computedMemberEvents.join(","), done.done, done.value);
