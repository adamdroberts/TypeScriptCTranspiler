const order: string[] = [];

function record(label: string, count: number): void {
    order.push(label + ":" + count);
    console.log("record:", label, count, order.join("|"));
}

process.nextTick(record, "first", 1);

process.nextTick((label: string, count: number) => {
    order.push(label + ":" + count);
    console.log("inline:", label, count, order.join("|"));
}, "second", 2);

process.nextTick(() => {
    order.push("outer");
    console.log("outer:", order.join("|"));
    process.nextTick(record, "nested", 3);
});

order.push("sync");
console.log("sync:", order.join("|"));
