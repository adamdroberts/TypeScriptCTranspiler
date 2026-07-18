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

Promise.try((): any => asyncResolve("try-resolve", "try value"))
    .then((value: any): any => {
        events.push("fulfilled:" + value);
        console.log("fulfilled:", events.join("|"));
        return value;
    });

Promise.try((): any => asyncReject("try-reject", "try bad"))
    .catch((reason: any): any => {
        events.push("rejected:" + reason);
        console.log("rejected:", events.join("|"));
        return "handled";
    });

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
