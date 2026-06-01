import { setImmediate as immediate } from "node:timers/promises";

let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}

const fulfilled = Promise.resolve("ready");
const adopted = Promise.resolve(fulfilled, mark("f"));

adopted.then((value: string) => {
    console.log("fulfilled:", value);
    return value;
});

const rejected = Promise.reject<string>("bad");
const adoptedRejected = Promise.resolve(rejected, mark("r"));

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
const adoptedPending = Promise.resolve(pendingSource, mark("p"));
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
console.log("ignored:", ignored);

const delayedSource = immediate("later");
Promise.resolve(delayedSource).then((value: string) => {
    console.log("delayed:", value);
});
