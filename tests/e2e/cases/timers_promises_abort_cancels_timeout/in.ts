declare const AbortController: { new(): any };

import { setTimeout as delay } from "node:timers/promises";

const controller = new AbortController();
const order: string[] = [];

delay(100, "cancelled", { signal: controller.signal }).catch((reason: any): void => {
    order.push("abort:" + reason);
});
controller.abort("stop");

delay(0, "after").then((value: string): void => {
    order.push(value);
    console.log(order.join("|"));
});
