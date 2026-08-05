let optionalMemberChainEvents: string[] = [];

function* optionalMemberChainDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")?.outer?.inner?.value,
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function run(label: string, receiver: any): void {
    optionalMemberChainEvents = [];
    if (receiver) {
        const inner: any = { value: "ok" };
        const outer: any = {};
        Object.defineProperty(receiver, "outer", {
            get: () => {
                optionalMemberChainEvents.push("outer");
                return outer;
            },
        });
        Object.defineProperty(outer, "inner", {
            get: () => {
                optionalMemberChainEvents.push("inner");
                return inner;
            },
        });
    }
    const iterator = optionalMemberChainDeclarationInitializer();
    const first: any = iterator.next();
    console.log(label + "-first", optionalMemberChainEvents.join(","), first.done, first.value);
    const second: any = iterator.next(receiver);
    console.log(label + "-second", optionalMemberChainEvents.join(","), second.done, second.value);
    const done: any = iterator.next();
    console.log(label + "-done", optionalMemberChainEvents.join(","), done.done, done.value);
}

run("present", {});
run("missing", null);
