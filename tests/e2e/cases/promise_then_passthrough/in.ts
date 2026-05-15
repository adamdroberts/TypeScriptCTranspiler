Promise.resolve("ready")
    .then()
    .then((value: string) => {
        console.log("omitted:", value);
        return value + "!";
    })
    .then(undefined, (reason: any) => {
        console.log("unexpected:", reason);
        return "bad";
    })
    .then((value: string) => {
        console.log("fulfilled:", value);
    });

Promise.reject<string>("boom")
    .then(undefined, (reason: string) => {
        console.log("handled:", reason);
        return "recovered";
    })
    .then((value: string) => {
        console.log("after:", value);
    });

const pending = Promise.race([] as Promise<string>[]);
let called = false;

pending
    .then()
    .then(undefined, (reason: string) => {
        called = true;
        return reason;
    });

console.log("pending:", String(pending), called);
