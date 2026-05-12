import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
let total = 0;

emitter.on("tick", (amount: number): void => {
    total += amount;
});

console.log("emit:", emitter.emit("tick", 4));
console.log("total:", total);
