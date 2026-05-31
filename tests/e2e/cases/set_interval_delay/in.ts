import { setInterval, clearInterval } from "timers";

const events: string[] = [];

setTimeout(() => {
    events.push("timeout");
}, 10);

let count = 0;
const interval = setInterval((label: string) => {
    count++;
    events.push(label + ":" + count);
    if (count === 2) {
        clearInterval(interval);
    }
}, 30, "interval");

setTimeout(() => {
    console.log(events.join("|"));
}, 80);
