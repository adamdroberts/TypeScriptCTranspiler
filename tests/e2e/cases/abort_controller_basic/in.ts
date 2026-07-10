declare const AbortController: { new(): any };
import { setTimeout as delay } from "node:timers/promises";

const controller: any = new AbortController();
console.log("initial:", controller.signal.aborted, controller.signal.reason);
controller.abort("cancelled");
console.log("aborted:", controller.signal.aborted, controller.signal.reason);
controller.abort("ignored");
console.log("idempotent:", controller.signal.aborted, controller.signal.reason);

delay(25, "late", { signal: controller.signal }).then((_value: any) => {
    console.log("unexpected timer fulfillment");
}).catch((reason: any) => {
    console.log("timer aborted:", reason);
});
