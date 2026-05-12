const emitter = new EventEmitter();
const seen: string[] = [];

function named(value: string): void {
    seen.push("named:" + value);
}

const closure = (value: string): void => {
    seen.push("closure:" + value);
};

emitter.on("data", named);
emitter.on("data", named);
emitter.once("data", named);
emitter.on("data", closure);

console.log("all:", emitter.listenerCount("data"));
console.log("named:", emitter.listenerCount("data", named));
console.log("closure:", emitter.listenerCount("data", closure));

emitter.emit("data", "first");
console.log("named after once:", emitter.listenerCount("data", named));

emitter.off("data", named);
console.log("named after off:", emitter.listenerCount("data", named));
console.log("all after off:", emitter.listenerCount("data"));

console.log("seen:", seen.join("|"));
