let events: string[] = [];

function* countUp(limit: number): Generator<string, string, number> {
    events.push("start");
    let total = 0;
    let i = 0;

    while (i < limit) {
        events.push("before:" + i + ":" + total);
        const delta = yield "yield-" + i;
        total += delta;
        events.push("after:" + i + ":" + total);
        i++;
    }

    events.push("done:" + total);
    return "total-" + total;
}

const iter = countUp(3);
let step = iter.next();
console.log(step.done, step.value);
step = iter.next(2);
console.log(step.done, step.value);
step = iter.next(4);
console.log(step.done, step.value);
step = iter.next(8);
console.log(step.done, step.value);
console.log(events.join("|"));
