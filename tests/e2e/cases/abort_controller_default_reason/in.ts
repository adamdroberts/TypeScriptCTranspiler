declare const AbortController: { new(): any };
import { setTimeout as delay } from "node:timers/promises";

const controller: any = new AbortController();
controller.abort();
const reason: any = controller.signal.reason;
console.log("default:", reason.name, reason.message, reason.code, String(reason), Object.prototype.toString.call(reason), reason === controller.signal.reason);
try {
    controller.signal.throwIfAborted();
} catch (thrown: any) {
    console.log("default throw:", thrown === reason, thrown.name, thrown.message, thrown.code, Object.prototype.toString.call(thrown));
}

const undefinedController: any = new AbortController();
undefinedController.abort(undefined);
const undefinedReason: any = undefinedController.signal.reason;
console.log("undefined:", undefinedReason.name, undefinedReason.message, undefinedReason.code);

const nullController: any = new AbortController();
nullController.abort(null);
console.log("null:", nullController.signal.reason === null);
try {
    nullController.signal.throwIfAborted();
} catch (thrown: any) {
    console.log("null throw:", thrown === null);
}

const customController: any = new AbortController();
const customReason: any = { tag: "custom", code: 901 };
customController.abort(customReason);
try {
    customController.signal.throwIfAborted();
} catch (thrown: any) {
    console.log("custom throw:", thrown === customReason, thrown.tag, thrown.code, Object.prototype.toString.call(thrown));
}
try {
    customController.signal.throwIfAborted();
} catch (thrown) {
    console.log("custom untyped throw:", thrown === customReason);
}

const rethrowController: any = new AbortController();
const rethrowReason: any = { tag: "rethrow" };
rethrowController.abort(rethrowReason);
try {
    try {
        rethrowController.signal.throwIfAborted();
    } catch (thrown: any) {
        console.log("nested throw:", thrown === rethrowReason);
        throw thrown;
    } finally {
        console.log("finally:", "ran");
    }
} catch (outer: any) {
    console.log("rethrow:", outer === rethrowReason);
}

delay(0, "late", { signal: controller.signal }).catch((value: any) => {
    console.log("timer:", value === reason, value.name, value.message, value.code);
});
