const emitter = new EventEmitter();
const other = new EventEmitter();

function onData(this: EventEmitter, value: any): void {
    console.log("this:", this === emitter, this === other, value);
    console.log("count:", this.listenerCount("data"));
}

function onceData(this: EventEmitter, value: any): void {
    console.log("once:", this === emitter, value);
}

emitter.on("data", onData);
emitter.once("data", onceData);

console.log("filter:", emitter.listenerCount("data", onData), EventEmitter.listenerCount(emitter, "data", onData));
emitter.emit("data", "first");
emitter.emit("data", "second");
emitter.off("data", onData);
console.log("after:", emitter.listenerCount("data", onData));
