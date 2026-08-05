let optionalComputedChainEvents: string[] = [];

function* optionalComputedChainDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver")?.["outer"]?.["inner"]?.["value"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function run(label: string, receiver: any): void {
    optionalComputedChainEvents = [];
    if (receiver) {
        const inner: any = { value: "ok" };
        const outer: any = {};
        Object.defineProperty(receiver, "outer", {
            get: () => {
                optionalComputedChainEvents.push("outer");
                return outer;
            },
        });
        Object.defineProperty(outer, "inner", {
            get: () => {
                optionalComputedChainEvents.push("inner");
                return inner;
            },
        });
    }
    const iterator = optionalComputedChainDeclarationInitializer();
    const first: any = iterator.next();
    console.log(label + "-first", optionalComputedChainEvents.join(","), first.done, first.value);
    const second: any = iterator.next(receiver);
    console.log(label + "-second", optionalComputedChainEvents.join(","), second.done, second.value);
    const done: any = iterator.next();
    console.log(label + "-done", optionalComputedChainEvents.join(","), done.done, done.value);
}

run("present", {});
run("missing", null);
