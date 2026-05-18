Promise.try(() => 21)
    .then((value) => value * 2)
    .then((value) => {
        console.log("value:", value);
    });

let counter = 0;
Promise.try(() => {
    counter += 1;
    return "ready";
}).then((value) => {
    console.log("side:", value, counter);
});

Promise.try(() => {
    throw "boom";
}).catch((reason) => {
    console.log("catch:", reason);
});
