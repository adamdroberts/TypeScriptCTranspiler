import timersPromises, { scheduler } from "node:timers/promises";
import * as timersPromisesNs from "timers/promises";

let namedWait = "pending";
let defaultYield = "pending";
let namespaceWait = "pending";
let optionWait = "pending";

const noSignal = undefined;
const refDisabled = false;
const schedulerOptions = { signal: noSignal, ref: refDisabled };
const schedulerVoidOptions = { ref: undefined, signal: void 0 };
const undefinedDelay = undefined;

scheduler.wait(0, schedulerOptions).then((_value: any): void => {
    namedWait = "settled";
});

timersPromises.scheduler.yield().then((_value: any): void => {
    defaultYield = "settled";
});

timersPromisesNs.scheduler.wait(undefinedDelay).then((_value: any): void => {
    namespaceWait = "settled";
});

timersPromises.scheduler.wait(void 0, schedulerVoidOptions).then((_value: any): void => {
    optionWait = "settled";
});

console.log("scheduler:", namedWait, defaultYield, namespaceWait, optionWait);
