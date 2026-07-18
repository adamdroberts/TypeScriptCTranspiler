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

Promise.resolve("base")
    .finally((): any => asyncResolve("fulfilled-finally", "ignored"))
    .then((value: any): any => {
        events.push("fulfilled:" + value);
        console.log("fulfilled:", events.join("|"));
        return Promise.reject("base-bad");
    })
    .finally((): any => asyncResolve("rejected-finally", "ignored"))
    .catch((reason: any): any => {
        events.push("rejected:" + reason);
        console.log("rejected:", events.join("|"));
        return "handled";
    })
    .then((_value: any): string => "next")
    .finally((): any => asyncReject("override-finally", "finalizer-bad"))
    .then((value: any): any => {
        console.log("should not fulfill:", value);
        return value;
    })
    .catch((reason: any): any => {
        events.push("override:" + reason);
        console.log("override:", events.join("|"));
        return "done";
    });

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync:" + (events.length ? " " + events.join("|") : ""));
