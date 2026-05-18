const events: string[] = [];

setTimeout((label: string, count: number) => {
    events.push(label + ":" + count);
    process.nextTick(() => {
        events.push("tick-from-timeout");
    });
    queueMicrotask(() => {
        events.push("micro-from-timeout");
    });
    setTimeout(() => {
        events.push("nested-timeout");
    }, 0);
}, 0, "first", 1);

setTimeout(() => {
    events.push("last-timeout");
}, 0);

setImmediate(() => {
    events.push("immediate");
});

process.nextTick(() => {
    events.push("tick");
});
queueMicrotask(() => {
    events.push("micro");
});

setImmediate(() => {
    console.log(events.join("|"));
});

console.log("sync");
