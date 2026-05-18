const events: string[] = [];

setImmediate((label: string, count: number) => {
    events.push(label + ":" + count);
    process.nextTick(() => {
        events.push("tick-from-immediate");
    });
    queueMicrotask(() => {
        events.push("micro-from-immediate");
    });
}, "first", 1);

process.nextTick(() => {
    events.push("tick");
});

queueMicrotask(() => {
    events.push("micro");
});

setImmediate(() => {
    events.push("last");
    console.log(events.join("|"));
});

console.log("sync");
