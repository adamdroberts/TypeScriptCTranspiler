let computedMemberChainEvents: string[] = [];

function* multiYieldComputedMemberChainAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")[yield "outer-key"][yield "inner-key"][yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = {};
const outer: any = {};
const inner: any = { value: "ok" };
Object.defineProperty(receiver, "outer", {
    get: () => {
        computedMemberChainEvents.push("outer");
        return outer;
    },
});
Object.defineProperty(outer, "inner", {
    get: () => {
        computedMemberChainEvents.push("inner");
        return inner;
    },
});

const iterator = multiYieldComputedMemberChainAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", computedMemberChainEvents.join(","), first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", computedMemberChainEvents.join(","), second.done, second.value);
const third: any = iterator.next("outer");
console.log("third", computedMemberChainEvents.join(","), third.done, third.value);
const fourth: any = iterator.next("inner");
console.log("fourth", computedMemberChainEvents.join(","), fourth.done, fourth.value);
const fifth: any = iterator.next("value");
console.log("fifth", computedMemberChainEvents.join(","), fifth.done, fifth.value);
const done: any = iterator.next();
console.log("done", computedMemberChainEvents.join(","), done.done, done.value);
