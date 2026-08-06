function syncStatement(): string {
    debugger;
    return "sync";
}

async function awaitedLoopControl(): Promise<string> {
    const events: string[] = [];
    for (
        var value = await Promise.resolve("loop");
        await Promise.resolve(value.length > 0);
        await Promise.resolve(value.length)
    ) {
        events.push("body");
        debugger;
        events.push(value);
        break;
    }
    return events.join(",");
}

function* lazyGenerator(): IterableIterator<string> {
    debugger;
    yield "generator";
    debugger;
}

console.log(syncStatement());
awaitedLoopControl().then((value: string): void => console.log(value));
let generated = "";
for (const value of lazyGenerator()) generated += value;
console.log(generated);
