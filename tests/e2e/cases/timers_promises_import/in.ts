import timersPromises from "timers/promises";
import { setTimeout as delay, setImmediate } from "node:timers/promises";
import * as nodeTimersPromises from "node:timers/promises";

let namedDelay = "";
let namedImmediate = "";
let namespaceDelay = "";
let defaultImmediate = "";
let optionDelay = "";
let optionImmediate = "";

const delayOptions = { signal: undefined, ref: false };
const immediateOptions = { ref: true, signal: undefined };
const noOptions = undefined;
const voidOptions = { ref: undefined, signal: void 0 };

delay(0, "named delay", delayOptions).then((value: string): void => {
    namedDelay = value;
});

setImmediate("named immediate", immediateOptions).then((value: string): void => {
    namedImmediate = value;
});

nodeTimersPromises.setTimeout(undefined, "namespace delay", noOptions).then((value: string): void => {
    namespaceDelay = value;
});

timersPromises.setImmediate("default immediate").then((value: string): void => {
    defaultImmediate = value;
});

nodeTimersPromises.setTimeout(void 0, "option delay", voidOptions).then((value: string): void => {
    optionDelay = value;
});

timersPromises.setImmediate("option immediate", { ref: false }).then((value: string): void => {
    optionImmediate = value;
});

console.log("named delay:", namedDelay);
console.log("named immediate:", namedImmediate);
console.log("namespace delay:", namespaceDelay);
console.log("default immediate:", defaultImmediate);
console.log("options:", optionDelay, optionImmediate);
