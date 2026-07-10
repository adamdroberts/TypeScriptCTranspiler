import events from "node:events";

const previous = events.defaultMaxListeners;
events.defaultMaxListeners = 9;

const emitter = new events.EventEmitter();
let total = 0;

emitter.on("tick", (amount: number): void => {
    total += amount;
});

const ready = events.once(emitter, "ready");

console.log("default max:", events.defaultMaxListeners, emitter.getMaxListeners());
console.log("count:", events.listenerCount(emitter, "tick"));
console.log("static count:", events.EventEmitter.listenerCount(emitter, "tick"));
console.log("listeners:", events.getEventListeners(emitter, "tick").length);
console.log("emit:", emitter.emit("tick", 7), total);
emitter.emit("ready", "ok", 3);

let onceValue = "";
ready.then((args: any[]): string => {
    onceValue = String(args[0]) + ":" + String(args[1]);
    console.log("once:", onceValue);
    return onceValue;
});

events.defaultMaxListeners = previous;
