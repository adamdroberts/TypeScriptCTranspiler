let optionalAccessEvents: string[] = [];

function* multiYieldOptionalAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = ((yield "receiver")[yield "key"])?.["value"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function run(label: string, inner: any): void {
    optionalAccessEvents = [];
    const receiver: any = {};
    Object.defineProperty(receiver, "key", {
        get: () => {
            optionalAccessEvents.push(label);
            return inner;
        },
    });
    const iterator = multiYieldOptionalAccessDeclarationInitializer();
    const first: any = iterator.next();
    console.log(label + "-first", optionalAccessEvents.join(","), first.done, first.value);
    const second: any = iterator.next(receiver);
    console.log(label + "-second", optionalAccessEvents.join(","), second.done, second.value);
    const third: any = iterator.next("key");
    console.log(label + "-third", optionalAccessEvents.join(","), third.done, third.value);
    const done: any = iterator.next();
    console.log(label + "-done", optionalAccessEvents.join(","), done.done, done.value);
}

run("present", { value: "ok" });
run("missing", null);
