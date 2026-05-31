import { setTimeout as delay } from "node:timers/promises";

const order: string[] = [];

delay(40, "delayed").then((value: string): void => {
    order.push(value);
});

delay(0, "zero").then((value: string): void => {
    order.push(value);
});

const duration = 20;
delay(duration, "dynamic").then((value: string): void => {
    order.push(value);
});

delay(10, undefined);

delay(80, "done").then((value: string): void => {
    console.log("result:" + order.join("|") + "|" + value);
});
