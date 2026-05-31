import timersPromises from "timers/promises";
import { setTimeout as delay, setTimeout as delayAlias, setImmediate, setImmediate as setImmediateAlias } from "node:timers/promises";
import * as nodeTimersPromises from "node:timers/promises";

let namedDelay = "";
let namedImmediate = "";
let aliasDelay = "";
let aliasImmediate = "";
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

delayAlias(0, "alias delay").then((value: string): void => {
    aliasDelay = value;
});

setImmediateAlias("alias immediate").then((value: string): void => {
    aliasImmediate = value;
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

console.log("named delay:", namedDelay === "" ? "<pending>" : namedDelay);
console.log("named immediate:", namedImmediate === "" ? "<pending>" : namedImmediate);
console.log("alias:", aliasDelay === "" ? "<pending>" : aliasDelay, aliasImmediate === "" ? "<pending>" : aliasImmediate);
console.log("namespace delay:", namespaceDelay === "" ? "<pending>" : namespaceDelay);
console.log("default immediate:", defaultImmediate === "" ? "<pending>" : defaultImmediate);
console.log("options:", optionDelay === "" ? "<pending>" : optionDelay, optionImmediate === "" ? "<pending>" : optionImmediate);
console.log("ignored:", ignoredDelay === "" ? "<pending>" : ignoredDelay, ignoredImmediate === "" ? "<pending>" : ignoredImmediate, ignoredOrder);
