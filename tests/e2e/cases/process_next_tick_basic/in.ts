const order: string[] = [];

function record(label: string, val: number): void {
    order.push(`${label}:${val}`);
    console.log("record:", label, val);
}

let counter = 0;
function getArg(label: string): number {
    counter++;
    order.push(`eval:${label}:${counter}`);
    return counter;
}

// 1. Queue first nextTick with evaluated arguments
process.nextTick(record, "first", getArg("A"));

// 2. Queue second nextTick with inline closure
process.nextTick((a: string, b: number) => {
    order.push(`inline:${a}:${b}`);
    console.log("inline:", a, b);
}, "second", getArg("B"));

// 3. Queue zero-arg nextTick
process.nextTick(() => {
    order.push("zero");
    console.log("zero-arg nextTick");
});

// 4. Queue final callback to verify the full order of execution
process.nextTick(() => {
    console.log("final order:", order.join("|"));
});

order.push("sync-end");
console.log("sync-end");
