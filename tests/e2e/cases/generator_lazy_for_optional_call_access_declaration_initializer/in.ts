function* optionalCallAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = ((yield "receiver")?.pop())?.["value"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + String(value);
    }
    return "done";
}

function run(label: string, receiver: any): void {
    const iterator = optionalCallAccessDeclarationInitializer();
    const first: any = iterator.next();
    console.log(label + "-first", receiver ? receiver.length : "null", first.done, first.value);
    const second: any = iterator.next(receiver);
    console.log(label + "-second", receiver ? receiver.length : "null", second.done, second.value);
    const done: any = iterator.next();
    console.log(label + "-done", receiver ? receiver.length : "null", done.done, done.value);
}

run("present", [{ value: "ok" }]);
run("missing", null);
