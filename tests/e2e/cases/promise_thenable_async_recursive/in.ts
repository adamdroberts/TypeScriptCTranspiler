const events: string[] = [];

const innerResolve: any = {
    then(resolve: any, reject: any): void {
        events.push("call inner resolve");
        queueMicrotask((): void => {
            events.push("settle inner resolve");
            resolve("final");
            reject("late inner reject");
        });
    },
};

const outerResolve: any = {
    then(resolve: any, reject: any): void {
        events.push("call outer resolve");
        queueMicrotask((): void => {
            events.push("settle outer resolve");
            resolve(innerResolve);
            reject("late outer reject");
        });
    },
};

Promise.resolve(outerResolve).then((value: any): any => {
    events.push("fulfilled:" + value);
    console.log("fulfilled:", events.join("|"));
    return value;
});

const innerReject: any = {
    then(resolve: any, reject: any): void {
        events.push("call inner reject");
        queueMicrotask((): void => {
            events.push("settle inner reject");
            reject("inner bad");
            resolve("late inner resolve");
        });
    },
};

const outerReject: any = {
    then(resolve: any, reject: any): void {
        events.push("call outer reject");
        queueMicrotask((): void => {
            events.push("settle outer reject");
            resolve(innerReject);
            reject("late outer reject");
        });
    },
};

Promise.resolve(outerReject).catch((reason: any): any => {
    events.push("rejected:" + reason);
    console.log("rejected:", events.join("|"));
    return "handled";
});

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
