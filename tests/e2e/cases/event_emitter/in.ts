const emitter = new EventEmitter();
const seen: string[] = [];

function named(label: string, count: number): void {
    seen.push("named:" + label + ":" + count);
}

const extra = "closure";
const listener = (label: string, count: number): void => {
    seen.push(extra + ":" + label + ":" + count);
};

emitter.on("data", named);
emitter.addListener("data", listener);
emitter.once("data", (label: string, count: number): void => {
    seen.push("once:" + label + ":" + count);
});

console.log("count before:", emitter.listenerCount("data"));
console.log("emit1:", emitter.emit("data", "alpha", 1));
console.log("count after once:", emitter.listenerCount("data"));

emitter.off("data", listener);
console.log("count after off:", emitter.listenerCount("data"));
console.log("emit2:", emitter.emit("data", "beta", 2));

emitter.removeAllListeners("data");
console.log("count after remove:", emitter.listenerCount("data"));
console.log("emit3:", emitter.emit("data", "gamma", 3));
console.log("seen:", seen.join("|"));
