const events: string[] = [];

const callResolve: any = {
    then(resolve: any, reject: any): void {
        events.push("then call resolve");
        queueMicrotask((): void => {
            events.push("settle call resolve");
            resolve.call({ ignored: true }, "call value");
            reject.call({ ignored: true }, "late call reject");
        });
    },
};

Promise.resolve(callResolve).then((value: any): any => {
    events.push("fulfilled:" + value);
    console.log("fulfilled:", events.join("|"));
    return value;
});

const applyReject: any = {
    then(resolve: any, reject: any): void {
        events.push("then apply reject");
        queueMicrotask((): void => {
            events.push("settle apply reject");
            reject.apply({ ignored: true }, ["apply reason"]);
            resolve.apply({ ignored: true }, ["late apply resolve"]);
        });
    },
};

Promise.resolve(applyReject).catch((reason: any): any => {
    events.push("rejected:" + reason);
    console.log("rejected:", events.join("|"));
    return "handled";
});

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
