import { scheduler } from "node:timers/promises";

const order: string[] = [];

scheduler.wait(0).then((_value: any): void => {
    order.push("wait");
});
scheduler.yield().then((_value: any): void => {
    order.push("yield");
});
scheduler.yield().then((_value: any): void => {
    console.log(order.join("|"));
});
