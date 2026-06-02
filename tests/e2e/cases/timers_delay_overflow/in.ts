const order: string[] = [];

const overflow = setTimeout(() => {
    order.push("overflow");
}, 2147483648);

const infinite = setTimeout(() => {
    order.push("infinity");
}, Infinity);

setImmediate(() => {
    order.push("immediate");
});

setTimeout(() => {
    order.push("zero");
}, 0);

setTimeout(() => {
    clearTimeout(overflow);
    clearTimeout(infinite);
    console.log(order.join("|"));
}, 5);
