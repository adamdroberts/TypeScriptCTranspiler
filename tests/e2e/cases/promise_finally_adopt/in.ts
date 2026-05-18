Promise.resolve("ok")
    .finally(() => Promise.resolve("ignored"))
    .then((value) => {
        console.log("fulfilled:", value);
    });

Promise.reject<string>("bad")
    .finally(() => Promise.resolve("ignored"))
    .catch((reason) => {
        console.log("rejected:", reason);
    });

Promise.resolve("start")
    .finally(() => Promise.reject("final bad"))
    .then((value) => {
        console.log("should not fulfill:", value);
    })
    .catch((reason) => {
        console.log("finally reject:", reason);
    });

Promise.reject<string>("orig")
    .finally(() => Promise.reject("final fail"))
    .catch((reason) => {
        console.log("finally reject2:", reason);
    });

const pending = new Promise<void>(() => {});
Promise.resolve("later")
    .finally(() => pending)
    .then((_value) => {
        console.log("pending then");
    })
    .catch((_reason) => {
        console.log("pending catch");
    });
