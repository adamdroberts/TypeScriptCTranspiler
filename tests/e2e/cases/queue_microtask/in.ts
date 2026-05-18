const order: string[] = [];

queueMicrotask(() => {
    order.push("micro1");
    console.log("micro1:", order.join(","));
    queueMicrotask(() => {
        order.push("nested");
        console.log("nested:", order.join(","));
    });
});

process.nextTick(() => {
    order.push("tick");
    console.log("tick:", order.join(","));
});

queueMicrotask(() => {
    order.push("micro2");
    console.log("micro2:", order.join(","));
});

order.push("sync");
console.log("sync:", order.join(","));
