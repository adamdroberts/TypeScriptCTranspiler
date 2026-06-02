const emitter = new EventEmitter();
const seen: string[] = [];

function normal(label: string): void {
    seen.push("normal:" + label);
}

function onceOnly(label: string): void {
    seen.push("once:" + label);
}

emitter.on("data", normal);
emitter.once("data", onceOnly);

const cooked: any[] = emitter.listeners("data") as any[];
const raw: any[] = emitter.rawListeners("data") as any[];

console.log("types:", typeof cooked[0], typeof cooked[1], typeof raw[1], typeof raw[1].listener);
Reflect.apply(cooked[0], undefined, ["a"]);
Reflect.apply(cooked[1], undefined, ["b"]);
Reflect.apply(raw[1], undefined, ["c"]);
Reflect.apply(raw[1].listener, undefined, ["d"]);

console.log("seen:", seen.join("|"));
console.log("stable:", Object.is(raw[1].listener, cooked[1]));
console.log("still registered:", emitter.listenerCount("data"));
