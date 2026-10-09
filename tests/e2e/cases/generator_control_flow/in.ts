const events: string[] = [];
function* subject(seed: number): Generator<number | string, string, number> {
    events.push("body");
    try {
        const value = yield seed;
        switch (value) {
            case 5: yield value + seed; break;
            default: yield "other";
        }
        return "finished";
    } finally {
        events.push("cleanup");
        yield "cleanup";
    }
}
const iterator = subject(3);
console.log(events.join(","));
console.log(iterator.next().value);
console.log(iterator.next(5).value);
const cleanup = iterator.return("returned");
console.log(cleanup.value, cleanup.done);
const final = iterator.next();
console.log(final.value, final.done);
console.log(events.join(","));

class Counter {
    base: number = 10;
    *values(limit: number): IterableIterator<number> {
        for (let index = 0; index < limit; index++) yield this.base + index;
    }
}
console.log(Array.from(new Counter().values(3)).join(","));
function* delegated(): Generator<number, string, unknown> { yield* [3, 5]; return "delegate-end"; }
const delegate = delegated();
console.log(delegate.next().value, delegate.next().value, delegate.next().value);
