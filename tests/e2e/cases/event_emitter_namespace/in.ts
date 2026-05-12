import * as events from "node:events";

const emitter = new events.EventEmitter();
let total = 0;

emitter.on("tick", (amount: number): void => {
    total += amount;
});

console.log("count:", events.listenerCount(emitter, "tick"));
console.log("emit:", emitter.emit("tick", 5));
console.log("total:", total);
