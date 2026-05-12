const emitter = new EventEmitter();

function record(message: string): void {
    console.log("record:", message);
}

emitter.on("data", record);
emitter.once("data", record);

console.log("before:", emitter.listenerCount("data", record));
emitter.off("data", record);
console.log("after off:", emitter.listenerCount("data", record));
emitter.emit("data", "first");
console.log("after emit:", emitter.listenerCount("data", record));
