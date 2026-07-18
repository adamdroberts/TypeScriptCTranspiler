let events: string[] = [];

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

function* allItems(): IterableIterator<any> {
    yield nestedFulfilled("all-a", "A");
    yield nestedFulfilled("all-b", "B");
}

function* raceItems(): IterableIterator<any> {
    yield nestedFulfilled("race-a", "race A");
    yield nestedFulfilled("race-b", "race B");
}

function* anyItems(): IterableIterator<any> {
    yield nestedRejected("any-a", "any A");
    yield nestedFulfilled("any-b", "any B");
}

function* settledItems(): IterableIterator<any> {
    yield nestedFulfilled("settled-a", "settled A");
    yield nestedRejected("settled-b", "settled B");
}

Promise.all(allItems())
    .then((items: any[]): Promise<any> => {
        console.log("all generator:", items.join(","), events.join("|"));
        events = [];
        return Promise.race(raceItems());
    })
    .then((value: any): Promise<any> => {
        console.log("race generator:", value, events.join("|"));
        events = [];
        return Promise.any(anyItems());
    })
    .then((value: any): Promise<any[]> => {
        console.log("any generator:", value, events.join("|"));
        events = [];
        return Promise.allSettled(settledItems());
    })
    .then((items: any[]): any[] => {
        const summary = items.map((item: any): string => {
            return item.status === "fulfilled"
                ? item.status + ":" + item.value
                : item.status + ":" + item.reason;
        }).join(",");
        console.log("settled generator:", summary, events.join("|"));
        return items;
    });

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
