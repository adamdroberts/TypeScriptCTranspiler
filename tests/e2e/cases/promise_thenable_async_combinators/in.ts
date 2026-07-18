const events: string[] = [];

function asyncFulfilled(label: string, value: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then:" + label);
            queueMicrotask((): void => {
                events.push("settle:" + label);
                resolve(value);
                reject("late:" + label);
            });
        },
    };
}

function asyncRejected(label: string, reason: string): any {
    return {
        then(resolve: any, reject: any): void {
            events.push("then:" + label);
            queueMicrotask((): void => {
                events.push("settle:" + label);
                reject(reason);
                resolve("late:" + label);
            });
        },
    };
}

Promise.race([asyncFulfilled("race", "race-win")] as any[])
    .then((value: any): Promise<any> => {
        console.log("race:", value, events.join("|"));
        return Promise.any([
            asyncRejected("any-reject", "any-skip"),
            asyncFulfilled("any-fulfill", "any-win"),
        ] as any[]);
    })
    .then((value: any): Promise<any[]> => {
        console.log("any:", value, events.join("|"));
        return Promise.allSettled([
            asyncFulfilled("settled-fulfill", "settled-ok"),
            asyncRejected("settled-reject", "settled-bad"),
        ] as any[]);
    })
    .then((items: any[]): any[] => {
        const summary = items.map((item: any): string => {
            return item.status === "fulfilled"
                ? item.status + ":" + item.value
                : item.status + ":" + item.reason;
        }).join(",");
        console.log("allSettled:", summary, events.join("|"));
        return items;
    });

console.log("sync:" + (events.length ? " " + events.join("|") : ""));
