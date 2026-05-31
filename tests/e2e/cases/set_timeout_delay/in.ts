const order: string[] = [];

setTimeout(() => {
    order.push("delayed");
}, 40);

setImmediate(() => {
    order.push("immediate");
});

setTimeout(() => {
    order.push("zero");
}, 0);

setTimeout((prefix: string) => {
    console.log(prefix + order.join("|"));
}, 80, "timer-order:");
