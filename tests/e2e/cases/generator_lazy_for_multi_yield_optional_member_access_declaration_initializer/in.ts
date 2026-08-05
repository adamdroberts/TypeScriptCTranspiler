let optionalMemberAccessEvents: string[] = [];

function* multiYieldOptionalMemberAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = ((yield "receiver")[yield "key"])?.value,
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function run(label: string, inner: any): void {
    optionalMemberAccessEvents = [];
    const receiver: any = {};
    Object.defineProperty(receiver, "key", {
        get: () => {
            optionalMemberAccessEvents.push(label);
            return inner;
        },
    });
    const iterator = multiYieldOptionalMemberAccessDeclarationInitializer();
    const first: any = iterator.next();
    console.log(label + "-first", optionalMemberAccessEvents.join(","), first.done, first.value);
    const second: any = iterator.next(receiver);
    console.log(label + "-second", optionalMemberAccessEvents.join(","), second.done, second.value);
    const third: any = iterator.next("key");
    console.log(label + "-third", optionalMemberAccessEvents.join(","), third.done, third.value);
    const done: any = iterator.next();
    console.log(label + "-done", optionalMemberAccessEvents.join(","), done.done, done.value);
}

run("present", { value: "ok" });
run("missing", null);
