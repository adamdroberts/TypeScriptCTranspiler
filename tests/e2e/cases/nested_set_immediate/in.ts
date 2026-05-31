const order: string[] = [];

setImmediate(() => {
    order.push("imm1");

    setImmediate(() => {
        order.push("imm2");
        console.log("ORDER:", order.join("|"));
    });

    setTimeout(() => {
        order.push("timeout0");
    }, 0);

    process.nextTick(() => {
        order.push("tick-from-imm1");
    });

    Promise.resolve(0).then((_val) => {
        order.push("promise-from-imm1");
    });
});
