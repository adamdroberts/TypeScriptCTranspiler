const events: string[] = [];

function asyncResolve(label: string, value: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("call " + label);
            queueMicrotask((): void => {
                events.push("settle " + label);
                resolve(value);
                reject("late reject " + label);
            });
        },
    };
}

function asyncReject(label: string, reason: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("call " + label);
            queueMicrotask((): void => {
                events.push("settle " + label);
                reject(reason);
                resolve("late resolve " + label);
            });
        },
    };
}

const resolved = new Promise<any>((resolve) => {
    events.push("resolve executor");
    setImmediate((): void => {
        events.push("resolve immediate");
        resolve(asyncResolve("executor-resolve", "executor value"));
    });
});

resolved.then((value: any): any => {
    events.push("fulfilled:" + value);
    return value;
});

const rejected = new Promise<any>((resolve) => {
    events.push("reject executor");
    setImmediate((): void => {
        events.push("reject immediate");
        resolve(asyncReject("executor-reject", "executor bad"));
    });
});

rejected.catch((reason: any): any => {
    events.push("rejected:" + reason);
    return "handled";
});

setImmediate((): void => {
    events.push("first immediate");
});

setImmediate((): void => {
    setImmediate((): void => {
        console.log(events.join("|"));
    });
});
