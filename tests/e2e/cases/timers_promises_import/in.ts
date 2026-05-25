import timersPromises from "timers/promises";
import { setTimeout as delay, setImmediate } from "node:timers/promises";
import * as nodeTimersPromises from "node:timers/promises";

let namedDelay = "";
let namedImmediate = "";
let namespaceDelay = "";
let defaultImmediate = "";

delay(0, "named delay").then((value: string): void => {
    namedDelay = value;
});

setImmediate("named immediate").then((value: string): void => {
    namedImmediate = value;
});

nodeTimersPromises.setTimeout(undefined, "namespace delay").then((value: string): void => {
    namespaceDelay = value;
});

timersPromises.setImmediate("default immediate").then((value: string): void => {
    defaultImmediate = value;
});

console.log("named delay:", namedDelay);
console.log("named immediate:", namedImmediate);
console.log("namespace delay:", namespaceDelay);
console.log("default immediate:", defaultImmediate);
