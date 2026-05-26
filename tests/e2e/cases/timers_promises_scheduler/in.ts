import timersPromises, { scheduler } from "node:timers/promises";
import * as timersPromisesNs from "timers/promises";

let namedWait = "pending";
let defaultYield = "pending";
let namespaceWait = "pending";
let optionWait = "pending";
let ignoredWait = "pending";
let ignoredYield = "pending";
let ignoredOrder = "";

const noSignal = undefined;
const refDisabled = false;
const schedulerOptions = { signal: noSignal, ref: refDisabled };
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

timersPromises.scheduler.wait(void (ignoredOrder += "D"), void (ignoredOrder += "O"), (ignoredOrder += "E", 1)).then((_value: any): void => {
    optionWait = "settled";
});

scheduler.wait(0, undefined, (ignoredOrder += "W", 1)).then((_value: any): void => {
    ignoredWait = "settled";
});

timersPromises.scheduler.yield((ignoredOrder += "Y", 2)).then((_value: any): void => {
    ignoredYield = "settled";
});

console.log("scheduler:", namedWait, defaultYield, namespaceWait, optionWait);
console.log("ignored:", ignoredWait, ignoredYield, ignoredOrder);
