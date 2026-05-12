const emitter = new EventEmitter();
let depth = 0;

emitter.once("tick", (): void => {
    console.log("once:", depth);
    if (depth === 0) {
        depth++;
        console.log("inner:", emitter.emit("tick"));
    }
});

console.log("outer:", emitter.emit("tick"));
console.log("count:", emitter.listenerCount("tick"));
