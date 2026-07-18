const events: string[] = [];

const asyncResolveThenable: any = {};
Object.defineProperty(asyncResolveThenable, "then", {
    get: function(): any {
        events.push("get resolve");
        return function(resolve: any, reject: any): void {
            events.push("call resolve");
            queueMicrotask((): void => {
                events.push("settle resolve");
                resolve("async value");
                reject("late reject");
            });
        };
    },
});

const asyncRejectThenable: any = {
    then(resolve: any, reject: any): void {
        events.push("call reject");
        queueMicrotask((): void => {
            events.push("settle reject");
            reject("async bad");
            resolve("late resolve");
        });
    },
};

Promise.resolve(asyncResolveThenable).then((value: any): any => {
    events.push("fulfilled:" + value);
    console.log("resolved:", events.join("|"));
    return value;
});

Promise.resolve(asyncRejectThenable).catch((reason: any): any => {
    events.push("rejected:" + reason);
    console.log("rejected:", events.join("|"));
    return "handled";
});

Promise.resolve("start")
    .then((value: string): any => ({
        then(resolve: any): void {
            events.push("call returned");
            queueMicrotask((): void => {
                events.push("settle returned");
                resolve(value + ":returned");
            });
        },
    } as any))
    .then((value: any): any => {
        events.push("returned:" + value);
        console.log("returned:", events.join("|"));
        return value;
    });

Promise.all([asyncResolveThenable, Promise.resolve("native")] as any[]).then((items: any[]): any[] => {
    events.push("all:" + items.join(","));
    console.log("all:", events.join("|"));
    return items;
});

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync:", events.join("|"));
