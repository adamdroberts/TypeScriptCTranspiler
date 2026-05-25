const order: string[] = [];
let ignoredSeen = "";

function mark(label: string): string {
    ignoredSeen += label;
    return label;
}

queueMicrotask(() => {
    order.push("micro1");
    console.log("micro1:", order.join(","));
    queueMicrotask(() => {
        order.push("nested");
        console.log("nested:", order.join(","));
    }, mark("n"));
}, mark("a"));

process.nextTick(() => {
    order.push("tick");
    console.log("tick:", order.join(","));
});

queueMicrotask(() => {
    order.push("micro2");
    console.log("micro2:", order.join(","));
}, mark("b"));

order.push("sync");
console.log("sync:", order.join(","));
console.log("ignored:", ignoredSeen);
