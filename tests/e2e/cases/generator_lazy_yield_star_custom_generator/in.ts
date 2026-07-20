const events: string[] = [];

class LazyBag {
    *[Symbol.iterator](): Generator<string, string, string> {
        try {
            events.push("bag-start");
            yield "bag-pause";
        } catch (error: any) {
            events.push("bag-catch:" + error);
            return "bag-done";
        } finally {
            events.push("bag-finally");
        }
        return "bag-normal";
    }
}

function* outer(): Generator<string, string, string> {
    const delegated = yield* new LazyBag();
    events.push("outer-after:" + delegated);
    return "outer-done";
}

const iter = outer();
const first: any = iter.next();
const result: any = iter.throw("custom-recover");
console.log("custom", first.done, first.value, result.done, result.value, events.join("|"));
