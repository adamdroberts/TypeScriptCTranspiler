declare const AbortController: { new(): any };
import { setTimeout as delay } from "node:timers/promises";

const controller: any = new AbortController();
controller.abort();
const reason: any = controller.signal.reason;
console.log("default:", reason.name, reason.message, reason.code, String(reason), Object.prototype.toString.call(reason), reason === controller.signal.reason);

const undefinedController: any = new AbortController();
undefinedController.abort(undefined);
const undefinedReason: any = undefinedController.signal.reason;
console.log("undefined:", undefinedReason.name, undefinedReason.message, undefinedReason.code);

const nullController: any = new AbortController();
nullController.abort(null);
console.log("null:", nullController.signal.reason === null);

delay(0, "late", { signal: controller.signal }).catch((value: any) => {
    console.log("timer:", value === reason, value.name, value.message, value.code);
});
