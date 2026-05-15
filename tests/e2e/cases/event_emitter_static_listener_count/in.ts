import * as events from "node:events";

const emitter = new events.EventEmitter();

function named(label: string): void {
    console.log("named:", label);
}

function other(label: string): void {
    console.log("other:", label);
}

emitter.on("data", named);
emitter.once("data", named);
emitter.on("data", other);

console.log("global static:", EventEmitter.listenerCount(emitter, "data"), EventEmitter.listenerCount(emitter, "data", named));
console.log("namespace static:", events.EventEmitter.listenerCount(emitter, "data"), events.EventEmitter.listenerCount(emitter, "data", other));

emitter.emit("data", "x");
console.log("after once:", events.EventEmitter.listenerCount(emitter, "data"), EventEmitter.listenerCount(emitter, "data", named));
