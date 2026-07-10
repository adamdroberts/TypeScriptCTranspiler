import { setImmediate as immediate, setTimeout as delay, scheduler } from "node:timers/promises";

const order: string[] = [];

delay(0, "delay").then((value: string): void => {
    order.push(value);
});
immediate("immediate").then((value: string): void => {
    order.push(value);
});

console.log("before:", order.join("|"));
scheduler.yield().then((_value: any): void => {
    console.log("after:", order.join("|"));
});
