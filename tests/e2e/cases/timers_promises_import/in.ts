import timersPromises from "timers/promises";
import { setTimeout as delay, setImmediate } from "node:timers/promises";
import * as nodeTimersPromises from "node:timers/promises";

let namedDelay = "";
let namedImmediate = "";
let namespaceDelay = "";
let defaultImmediate = "";
let optionDelay = "";
let optionImmediate = "";

delay(0, "named delay", { signal: undefined, ref: false }).then((value: string): void => {
    namedDelay = value;
});

setImmediate("named immediate", { ref: true, signal: undefined }).then((value: string): void => {
    namedImmediate = value;
});

nodeTimersPromises.setTimeout(undefined, "namespace delay").then((value: string): void => {
    namespaceDelay = value;
});

timersPromises.setImmediate("default immediate").then((value: string): void => {
    defaultImmediate = value;
});

nodeTimersPromises.setTimeout(void 0, "option delay", { ref: undefined, signal: void 0 }).then((value: string): void => {
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
