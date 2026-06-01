let events: string[] = [];

function* skipFor(limit: number): Generator<string, string, number> {
    let total = 0;
    let i = 0;

    for (; i < limit; i++) {
        events.push("for:" + i);
        if (i !== 1 && i !== 3) {
            events.push("skip-for:" + i);
            continue;
        }

        const delta = yield "odd-" + i;
        total += delta;
        events.push("after-for:" + i + ":" + total);

        if (i === 3) {
            events.push("continue-after-yield:" + i);
            continue;
        }

        events.push("tail-for:" + i);
    }

    return "for-total-" + total;
}

function* skipWhile(limit: number): Generator<string, string, number> {
    let i = 0;
    let total = 0;

    while (i < limit) {
        i++;
        events.push("while:" + i);
        if (i === 2) {
            events.push("skip-while:" + i);
            continue;
        }

        const delta = yield "while-yield-" + i;
        total += delta;
    }

    return "while-total-" + total;
}

let step = skipFor(5);
let result = step.next();
console.log(result.done, result.value);
result = step.next(10);
console.log(result.done, result.value);
result = step.next(20);
console.log(result.done, result.value);

step = skipWhile(4);
result = step.next();
console.log(result.done, result.value);
result = step.next(1);
console.log(result.done, result.value);
result = step.next(3);
console.log(result.done, result.value);
result = step.next(4);
console.log(result.done, result.value);

console.log(events.join("|"));
