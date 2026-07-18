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

Promise.try((): any => asyncResolveToPromise("fulfilled thenable", "fulfilled value"))
    .then((value: any): any => {
        events.push("fulfilled:" + value);
        return value;
    });

Promise.try((): any => asyncResolveToRejectedPromise("rejected thenable", "rejected reason"))
    .catch((reason: any): any => {
        events.push("rejected:" + reason);
        return "handled";
    });

setImmediate((): void => {
    setImmediate((): void => {
        console.log(events.join("|"));
    });
});
