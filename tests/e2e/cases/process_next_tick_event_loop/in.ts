const order: string[] = [];

order.push("sync-start");

process.nextTick(() => {
    order.push("tick1");
    process.nextTick(() => {
        order.push("tick-nested");
    });
    Promise.resolve(0).then((_val) => {
        order.push("micro-from-tick1");
    });
});

Promise.resolve(0).then((_val) => {
    order.push("micro1");
    process.nextTick(() => {
        order.push("tick-from-micro1");
    });
});

setTimeout(() => {
    order.push("timeout1");
    process.nextTick(() => {
        order.push("tick-from-timeout1");
    });
}, 0);

setImmediate(() => {
    order.push("immediate1");
    process.nextTick(() => {
        order.push("tick-from-immediate1");
    });
});

order.push("sync-end");

setImmediate(() => {
    order.push("immediate2");
    console.log("EVENT_LOOP_ORDER:", order.join("|"));
});
