const events: string[] = [];

const resolved = new Promise<string>((resolve) => {
    events.push("resolve executor");
    setImmediate(() => {
        events.push("resolve immediate");
        resolve("async value");
    });
});

resolved.then((value: string): string => {
    events.push("resolved:" + value);
    return value;
});

const rejected = new Promise<string>((resolve, reject) => {
    events.push("reject executor");
    setImmediate(() => {
        events.push("reject immediate");
        reject("async bad");
    });
});

rejected.catch((reason: string): string => {
    events.push("rejected:" + reason);
    return "handled";
});

const resolvedThenThrown = new Promise<string>((resolve) => {
    events.push("resolve throw executor");
    resolve("kept");
    throw "ignored";
});

resolvedThenThrown.then((value: string): string => {
    events.push("resolve before throw:" + value);
    return value;
});

setImmediate(() => {
    setImmediate(() => {
        console.log(events.join("|"));
    });
});
