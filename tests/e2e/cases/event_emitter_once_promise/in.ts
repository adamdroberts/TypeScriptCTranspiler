import { EventEmitter, once } from "events";
import * as events from "node:events";

const emitter = new EventEmitter();
const ready = once(emitter, "ready");

console.log("listeners before:", emitter.listenerCount("ready"), emitter.listenerCount("error"));
emitter.emit("ready", "alpha", 7);
console.log("listeners after:", emitter.listenerCount("ready"), emitter.listenerCount("error"));

let resolved = "";
ready.then((args: any[]): string => {
    resolved = String(args[0]) + ":" + String(args[1]);
    return resolved;
});
console.log("resolved:", resolved);

const failing = new events.EventEmitter();
const rejected = events.once(failing, "ready");

console.log("reject listeners before:", failing.listenerCount("ready"), failing.listenerCount("error"));
failing.emit("error", "boom");
console.log("reject listeners after:", failing.listenerCount("ready"), failing.listenerCount("error"));

let rejectedReason = "";
rejected.catch((reason: any): any[] => {
    rejectedReason = String(reason);
    return [];
});
console.log("rejected:", rejectedReason);

const errorEmitter = new EventEmitter();
const errorEvent = once(errorEmitter, "error");

errorEmitter.emit("error", "handled");

let handledError = "";
errorEvent.then((args: any[]): any[] => {
    handledError = String(args[0]);
    return args;
});
console.log("error resolved:", handledError, errorEmitter.listenerCount("error"));
