const emitter = new EventEmitter();
const seen: string[] = [];
let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}

function normal(label: string): void {
    seen.push("normal:" + label);
}

function onceOnly(label: string): void {
    seen.push("once:" + label);
}

emitter.on("data", normal);
emitter.once("data", onceOnly);
emitter.once("data", onceOnly);

const raw = emitter.rawListeners("data", mark("r"));
const cooked = emitter.listeners("data");
const rawAgain = emitter.rawListeners("data", mark("a"));

console.log("lengths:", raw.length, cooked.length);
console.log("types:", typeof raw[0], typeof raw[1], raw.join("|"));
console.log("normal:", Object.is(raw[0], cooked[0]), typeof raw[0].listener);
console.log("once:", Object.is(raw[1], cooked[1]), Object.is(raw[1].listener, cooked[1]), typeof raw[1].listener);
console.log("duplicates:", Object.is(raw[1], raw[2]), Object.is(raw[1].listener, raw[2].listener));
console.log("stable:", Object.is(raw[1], rawAgain[1]), Object.is(raw[2], rawAgain[2]));

raw.push("extra");
console.log("copy:", raw.length, emitter.rawListeners("data").length);

console.log("emit:", emitter.emit("data", "x"));
console.log("seen:", seen.join("|"));

const after = emitter.rawListeners("data");
console.log("after:", after.length, Object.is(after[0], cooked[0]));
console.log("missing:", emitter.rawListeners("missing", mark("m")).length);
console.log("ignored:", ignoredSeen);
