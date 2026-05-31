const order: string[] = [];

setTimeout(() => {
    order.push("timeout");
    console.log("timeout:", order.join(","));
}, 0);

setImmediate(() => {
    order.push("immediate");
    console.log("immediate:", order.join(","));
});

Promise.resolve("promise").then((val) => {
    order.push(val);
    console.log("promise:", order.join(","));
});

queueMicrotask(() => {
    order.push("microtask");
    console.log("microtask:", order.join(","));
});

process.nextTick(() => {
    order.push("nextTick");
    console.log("nextTick:", order.join(","));
});

order.push("sync");
console.log("sync:", order.join(","));
