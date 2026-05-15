const order: string[] = [];

process.nextTick(() => {
    order.push("tick1");
    console.log("tick1:", order.join(","));
    process.nextTick(() => {
        order.push("nested");
        console.log("nested:", order.join(","));
    });
});

process.nextTick(() => {
    order.push("tick2");
    console.log("tick2:", order.join(","));
});

order.push("sync");
console.log("sync:", order.join(","));
