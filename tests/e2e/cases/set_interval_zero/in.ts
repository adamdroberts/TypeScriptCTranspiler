import { setInterval, clearInterval } from "timers";

const events: string[] = [];

let count1 = 0;
const interval1 = setInterval((label: string, suffix: number) => {
    count1++;
    events.push("int1:" + label + ":" + suffix + ":" + count1);
    if (count1 === 3) {
        clearInterval(interval1);
    }
}, 0, "A", 99);

let count2 = 0;
const interval2 = setInterval(() => {
    count2++;
    events.push("int2:" + count2);
    if (count2 === 2) {
        clearInterval(interval2);
    }
}, -0);

let count3 = 0;
const interval3 = setInterval(() => {
    count3++;
    events.push("int3:" + count3);
    if (count3 === 1) {
        clearInterval(interval3);
    }
}, undefined);

let count4 = 0;
const interval4 = setInterval(() => {
    count4++;
    events.push("int4:" + count4);
    if (count4 === 1) {
        clearInterval(interval4);
    }
}, void 0);

const intervalCancel = setInterval(() => {
    events.push("should-not-run");
}, 0);
clearInterval(intervalCancel);

setImmediate(() => {
    console.log(events.join("|"));
});
