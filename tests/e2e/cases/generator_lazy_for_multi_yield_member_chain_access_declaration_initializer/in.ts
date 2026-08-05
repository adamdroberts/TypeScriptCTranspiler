let memberEvents: string[] = [];

function* multiYieldMemberChainAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").outer.inner[yield "key"],
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
const outer: any = {};
Object.defineProperty(receiver, "outer", {
    get: () => {
        memberEvents.push("outer");
        return outer;
    },
});
Object.defineProperty(outer, "inner", {
    get: () => {
        memberEvents.push("inner");
        return inner;
    },
});

const iterator = multiYieldMemberChainAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", memberEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", memberEvents.join(","), second.done, second.value);
const third: any = iterator.next("value");
console.log("third", memberEvents.join(","), third.done, third.value);
const done: any = iterator.next();
console.log("done", memberEvents.join(","), done.done, done.value);
