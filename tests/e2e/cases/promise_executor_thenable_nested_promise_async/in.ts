const events: string[] = [];

function asyncResolveToPromise(label: string, value: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("call " + label);
            queueMicrotask((): void => {
                events.push("settle " + label);
                resolve(Promise.resolve(value));
                reject("late reject " + label);
            });
        },
    };
}

function asyncResolveToRejectedPromise(label: string, reason: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("call " + label);
            queueMicrotask((): void => {
                events.push("settle " + label);
                resolve(Promise.reject(reason));
                reject("late reject " + label);
            });
        },
    };
}

const fulfilled = new Promise<any>((resolve) => {
    events.push("fulfilled executor");
    setImmediate((): void => {
        events.push("fulfilled immediate");
        resolve(asyncResolveToPromise("fulfilled thenable", "fulfilled value"));
    });
});

fulfilled.then((value: any): any => {
    events.push("fulfilled:" + value);
    return value;
});

const rejected = new Promise<any>((resolve) => {
    events.push("rejected executor");
    setImmediate((): void => {
        events.push("rejected immediate");
        resolve(asyncResolveToRejectedPromise("rejected thenable", "rejected reason"));
    });
});

rejected.catch((reason: any): any => {
    events.push("rejected:" + reason);
    return "handled";
});

setImmediate((): void => {
    setImmediate((): void => {
        console.log(events.join("|"));
    });
});
