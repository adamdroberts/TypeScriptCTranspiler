let events: string[] = [];

function* countFor(limit: number): Generator<string, string, number> {
    events.push("start");
    let total = 0;

    for (let i = 0; i < limit; i++) {
        events.push("before:" + i + ":" + total);
        const delta = yield "yield-" + i;
        total += delta;
        events.push("after:" + i + ":" + total);
    }

    events.push("done:" + total);
    return "total-" + total;
}

const iter = countFor(3);
let step = iter.next();
console.log(step.done, step.value);
step = iter.next(3);
console.log(step.done, step.value);
step = iter.next(5);
console.log(step.done, step.value);
step = iter.next(7);
console.log(step.done, step.value);
console.log(events.join("|"));
