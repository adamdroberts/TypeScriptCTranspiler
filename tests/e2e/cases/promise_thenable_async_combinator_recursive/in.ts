const events: string[] = [];

function delayedFulfilled(label: string, value: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then inner " + label);
            queueMicrotask((): void => {
                events.push("settle inner " + label);
                resolve(value);
                reject("late inner " + label);
            });
        },
    };
}

function delayedRejected(label: string, reason: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then inner " + label);
            queueMicrotask((): void => {
                events.push("settle inner " + label);
                reject(reason);
                resolve("late inner " + label);
            });
        },
    };
}

function nestedFulfilled(label: string, value: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then outer " + label);
            queueMicrotask((): void => {
                events.push("settle outer " + label);
                resolve(delayedFulfilled(label, value));
                reject("late outer " + label);
            });
        },
    };
}

function nestedRejected(label: string, reason: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then outer " + label);
            queueMicrotask((): void => {
                events.push("settle outer " + label);
                resolve(delayedRejected(label, reason));
                reject("late outer " + label);
            });
        },
    };
}

Promise.all([nestedFulfilled("all-a", "A"), nestedFulfilled("all-b", "B")] as any[])
    .then((items: any[]): any[] => {
        events.push("all:" + items.join(","));
        console.log("all:", events.join("|"));
        return items;
    });

Promise.race([nestedFulfilled("race-a", "race A"), nestedFulfilled("race-b", "race B")] as any[])
    .then((value: any): any => {
        events.push("race:" + value);
        console.log("race:", events.join("|"));
        return value;
    });

Promise.any([nestedRejected("any-a", "any A"), nestedFulfilled("any-b", "any B")] as any[])
    .then((value: any): any => {
        events.push("any:" + value);
        console.log("any:", events.join("|"));
        return value;
    });

Promise.allSettled([nestedFulfilled("settled-a", "settled A"), nestedRejected("settled-b", "settled B")] as any[])
    .then((items: any[]): any[] => {
        const summary = items.map((item: any): string => {
            return item.status === "fulfilled"
                ? item.status + ":" + item.value
                : item.status + ":" + item.reason;
        }).join(",");
        events.push("settled:" + summary);
        console.log("settled:", events.join("|"));
        return items;
    });

queueMicrotask((): void => {
    events.push("external");
});

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
