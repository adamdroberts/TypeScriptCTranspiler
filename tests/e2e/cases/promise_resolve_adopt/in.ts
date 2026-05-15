const fulfilled = Promise.resolve("ready");
const adopted = Promise.resolve(fulfilled);

adopted.then((value: string) => {
    console.log("fulfilled:", value);
    return value;
});

const rejected = Promise.reject<string>("bad");
const adoptedRejected = Promise.resolve(rejected);

adoptedRejected
    .catch((reason: string) => {
        console.log("rejected:", reason);
        return "handled";
    })
    .then((value: string) => {
        console.log("recovered:", value);
        return value;
    });

const pendingSource = Promise.race([] as Promise<string>[]);
const adoptedPending = Promise.resolve(pendingSource);
let callbacks = 0;

adoptedPending
    .then((value: string) => {
        callbacks++;
        return value;
    })
    .catch((reason: string) => {
        callbacks++;
        return reason;
    });

console.log("pending:", adoptedPending.toString());
console.log("callbacks:", callbacks);
