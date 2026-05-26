import timersPromises from "timers/promises";
import { setTimeout as delay, setImmediate } from "node:timers/promises";
import * as nodeTimersPromises from "node:timers/promises";

let namedDelay = "";
let namedImmediate = "";
let namespaceDelay = "";
let defaultImmediate = "";
let optionDelay = "";
let optionImmediate = "";
let ignoredDelay = "";
let ignoredImmediate = "";
let ignoredOrder = "";

const noSignal = undefined;
const refDisabled = false;
const refEnabled = true;
const delayOptions = { signal: noSignal, ref: refDisabled };
const immediateOptions = { ref: refEnabled, signal: noSignal };
const noOptions = undefined;
const undefinedDelay = undefined;

delay(0, "named delay", delayOptions).then((value: string): void => {
    namedDelay = value;
});

setImmediate("named immediate", immediateOptions).then((value: string): void => {
    namedImmediate = value;
});

nodeTimersPromises.setTimeout(undefinedDelay, "namespace delay", noOptions).then((value: string): void => {
    namespaceDelay = value;
});

timersPromises.setImmediate("default immediate").then((value: string): void => {
    defaultImmediate = value;
});

nodeTimersPromises.setTimeout(void (ignoredOrder += "T"), "option delay", void (ignoredOrder += "O"), (ignoredOrder += "E", 3)).then((value: string): void => {
    optionDelay = value;
});

timersPromises.setImmediate("option immediate", void (ignoredOrder += "M")).then((value: string): void => {
    optionImmediate = value;
});

delay(0, "ignored delay", undefined, (ignoredOrder += "D", 1)).then((value: string): void => {
    ignoredDelay = value;
});

timersPromises.setImmediate("ignored immediate", undefined, (ignoredOrder += "I", 2)).then((value: string): void => {
    ignoredImmediate = value;
});

console.log("named delay:", namedDelay);
console.log("named immediate:", namedImmediate);
console.log("namespace delay:", namespaceDelay);
console.log("default immediate:", defaultImmediate);
console.log("options:", optionDelay, optionImmediate);
console.log("ignored:", ignoredDelay, ignoredImmediate, ignoredOrder);
