Promise.resolve("ok")
    .catch()
    .finally()
    .then((value: string) => {
        console.log("fulfilled:", value);
    });

Promise.reject<string>("bad")
    .catch()
    .catch((reason: string) => {
        console.log("catch omitted:", reason);
        return "recovered";
    })
    .finally(undefined)
    .then((value: string) => {
        console.log("after catch:", value);
    });

Promise.reject<string>("again")
    .catch(undefined)
    .finally(undefined)
    .catch((reason: string) => {
        console.log("undefined handlers:", reason);
        return "done";
    });

let finallyCalls = 0;

Promise.resolve("side")
    .finally(() => {
        finallyCalls = finallyCalls + 1;
    })
    .then((value: string) => {
        console.log("finally callback:", value, finallyCalls);
    });

const pending = Promise.race([] as Promise<string>[]);
const after = pending.catch().finally();
let touched = false;

after.then((value: string) => {
    touched = true;
});

console.log("pending:", String(after), touched);
