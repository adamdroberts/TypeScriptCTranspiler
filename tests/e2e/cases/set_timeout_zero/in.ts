const events: string[] = [];
const ZERO_DELAY = 0;
const NEGATIVE_ZERO_DELAY = -0;
const UNDEFINED_DELAY = undefined;

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
    }, ZERO_DELAY);
}, ZERO_DELAY, "first", 1);

setTimeout(() => {
    events.push("last-timeout");
}, ZERO_DELAY);

setTimeout(() => {
    events.push("undefined-timeout");
}, UNDEFINED_DELAY);

setTimeout(() => {
    events.push("void-timeout");
}, void 0);

setTimeout(() => {
    events.push("negative-zero-timeout");
}, NEGATIVE_ZERO_DELAY);

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
