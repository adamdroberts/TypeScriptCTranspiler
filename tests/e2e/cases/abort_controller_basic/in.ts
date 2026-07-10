declare const AbortController: { new(): any };
import { scheduler, setImmediate as immediate, setTimeout as delay } from "node:timers/promises";

const controller: any = new AbortController();
console.log("methods:", controller.abort.name, controller.abort.length, Object.hasOwn(controller.abort, "prototype"), controller.signal.throwIfAborted.name, controller.signal.throwIfAborted.length, Object.hasOwn(controller.signal.throwIfAborted, "prototype"), controller.signal.addEventListener.name, controller.signal.addEventListener.length, Object.hasOwn(controller.signal.addEventListener, "prototype"));
try {
    Reflect.construct(controller.abort, []);
    console.log("construct:", "ok");
} catch (err: any) {
    console.log("construct:", err);
}
controller.signal.addEventListener("abort", (event: any) => {
    console.log("abort event:", event.type);
});
const removedListener = (_event: any) => {
    console.log("unexpected removed event");
};
controller.signal.addEventListener("abort", removedListener);
controller.signal.removeEventListener("abort", removedListener);
controller.signal.onabort = (event: any) => {
    console.log("onabort:", event.type);
};
console.log("initial:", controller.signal.aborted, controller.signal.reason);
controller.abort("cancelled");
console.log("aborted:", controller.signal.aborted, controller.signal.reason);
controller.abort("ignored");
console.log("idempotent:", controller.signal.aborted, controller.signal.reason);

try {
    controller.signal.throwIfAborted();
    console.log("unexpected throwIfAborted success");
} catch (reason) {
    console.log("throwIfAborted:", reason);
}

delay(25, "late", { signal: controller.signal }).then((_value: any) => {
    console.log("unexpected timer fulfillment");
}).catch((reason: any) => {
    console.log("timer aborted:", reason);
});

immediate("now", { signal: controller.signal }).catch((reason: any) => {
    console.log("immediate aborted:", reason);
});

scheduler.wait(25, { signal: controller.signal }).catch((reason: any) => {
    console.log("scheduler aborted:", reason);
});
