declare const AbortController: { new(): any };

import { setImmediate as immediate } from "node:timers/promises";

const controller: any = new AbortController();
const order: string[] = [];

immediate("cancelled", { signal: controller.signal }).then((_value: string): void => {
    order.push("unexpected");
}).catch((reason: any): void => {
    order.push("abort:" + reason);
});
console.log("before:", order.join("|"));
controller.abort("stop");

immediate("after").then((value: string): void => {
    order.push(value);
    console.log(order.join("|"));
});
