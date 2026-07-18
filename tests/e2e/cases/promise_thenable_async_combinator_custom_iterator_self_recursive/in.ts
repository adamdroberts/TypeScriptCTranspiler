let events: string[] = [];

interface Step {
    done: boolean;
    value: any;
}

class ThenableIterator {
    items: any[];
    index: number;

    constructor(items: any[]) {
        this.items = items;
        this.index = 0;
    }

    [Symbol.iterator](): ThenableIterator {
        return this;
    }

    next(): Step {
        if (this.index >= this.items.length) {
            return { done: true, value: undefined };
        }
        const value = this.items[this.index];
        this.index++;
        return { done: false, value };
    }
}

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

Promise.all(new ThenableIterator([nestedFulfilled("all-a", "A"), nestedFulfilled("all-b", "B")]))
    .then((items: any[]): Promise<any> => {
        console.log("all self:", items.join(","), events.join("|"));
        events = [];
        return Promise.race(new ThenableIterator([nestedFulfilled("race-a", "race A"), nestedFulfilled("race-b", "race B")]));
    })
    .then((value: any): Promise<any> => {
        console.log("race self:", value, events.join("|"));
        events = [];
        return Promise.any(new ThenableIterator([nestedRejected("any-a", "any A"), nestedFulfilled("any-b", "any B")]));
    })
    .then((value: any): Promise<any[]> => {
        console.log("any self:", value, events.join("|"));
        events = [];
        return Promise.allSettled(new ThenableIterator([nestedFulfilled("settled-a", "settled A"), nestedRejected("settled-b", "settled B")]));
    })
    .then((items: any[]): any[] => {
        const summary = items.map((item: any): string => {
            return item.status === "fulfilled"
                ? item.status + ":" + item.value
                : item.status + ":" + item.reason;
        }).join(",");
        console.log("settled self:", summary, events.join("|"));
        return items;
    });

console.log("sync" + (events.length ? ": " + events.join("|") : ":"));
