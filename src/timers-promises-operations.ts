import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";
import {runtimeCallbackTimerDescriptors} from "./global-bindings";

/** Project the native operation List; argument positions and activation
 * policy remain owned by the same descriptors consumed by the runtime. */
export const timersPromiseOperations: ReadonlyMap<string, {constant: string; interval: boolean}> = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime/tsc_timers_promises.def"), "utf8")
        .matchAll(/^TSC_TIMERS_PROMISE_OPERATION\("([\w.]+)", (\w+), -?\d+, -?\d+, -?\d+, \w+, (true|false), (\d+), (true|false)\)$/gm)]
        .map(([, name, operation, interval]) => [name!, {
            constant: `TSC_TIMERS_PROMISE_${operation}`,
            interval: interval === "true",
        }] as const),
);

export const callbackTimerOperations: ReadonlyMap<string, string> = new Map(
    [...runtimeCallbackTimerDescriptors].filter(([,descriptor])=>descriptor.moduleExport)
        .map(([name,descriptor])=>[name,`TSC_CALLBACK_TIMER_${descriptor.operation}`] as const),
);
