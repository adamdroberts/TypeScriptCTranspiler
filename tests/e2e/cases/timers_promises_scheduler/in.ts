import timersPromises, { scheduler } from "node:timers/promises";
import * as timersPromisesNs from "timers/promises";

let namedWait = "pending";
let defaultYield = "pending";
let namespaceWait = "pending";
let optionWait = "pending";

scheduler.wait(0, { signal: undefined, ref: false }).then((_value: any): void => {
    namedWait = "settled";
});

timersPromises.scheduler.yield().then((_value: any): void => {
    defaultYield = "settled";
});

timersPromisesNs.scheduler.wait(undefined).then((_value: any): void => {
    namespaceWait = "settled";
});

timersPromises.scheduler.wait(void 0, { ref: undefined, signal: void 0 }).then((_value: any): void => {
    optionWait = "settled";
});

console.log("scheduler:", namedWait, defaultYield, namespaceWait, optionWait);
