import { scheduler } from "node:timers/promises";

const order: string[] = [];

const waited = scheduler.wait(0).then((_value: any): void => {
    order.push("wait");
});
const yielded = scheduler.yield().then((_value: any): void => {
    order.push("yield");
});
Promise.all([waited, yielded]).then((_value: any): void => {
    console.log(order.sort().join("|"));
});
