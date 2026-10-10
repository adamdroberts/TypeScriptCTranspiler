import { setImmediate as immediate, setTimeout as delay, scheduler } from "node:timers/promises";

const order: string[] = [];

const delayed = delay(0, "delay").then((value: string): void => {
    order.push(value);
});
const immediateResult = immediate("immediate").then((value: string): void => {
    order.push(value);
});

console.log("before:", order.join("|"));
Promise.all([delayed, immediateResult, scheduler.yield()]).then((_value: any): void => {
    console.log("after:", order.sort().join("|"));
});
