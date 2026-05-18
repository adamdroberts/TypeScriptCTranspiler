Promise.resolve(20)
    .then((value) => Promise.resolve(value + 2))
    .then((value) => {
        console.log("then:", value * 2);
    });

Promise.reject<number>("first")
    .then(undefined, (reason) => {
        console.log("reject:", reason);
        return Promise.resolve(7);
    })
    .then((value) => {
        console.log("recover:", value);
    });

Promise.try(() => Promise.resolve("ready"))
    .then((value) => {
        console.log("try:", value);
    });

const pending = new Promise<string>(() => {});
Promise.try(() => pending)
    .then((_value) => {
        console.log("pending then");
    })
    .catch((_reason) => {
        console.log("pending catch");
    });
