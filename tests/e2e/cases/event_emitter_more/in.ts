import { EventEmitter, listenerCount } from "events";

const emitter = new EventEmitter();
const seen: string[] = [];
let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}

emitter.on("data", (label: string): void => {
    seen.push("on:" + label);
});
emitter.prependListener("data", (label: string): void => {
    seen.push("pre:" + label);
});
emitter.prependOnceListener("data", (label: string): void => {
    seen.push("once:" + label);
});
emitter.on("other", (): void => {
    seen.push("other");
});

console.log("names:", emitter.eventNames().join("|"));
console.log("names ignored:", emitter.eventNames(mark("e")).join("|"), ignoredSeen);
console.log("static count:", listenerCount(emitter, "data"));
console.log("emit1:", emitter.emit("data", "a"));
console.log("after once:", listenerCount(emitter, "data"));
console.log("emit2:", emitter.emit("data", "b"));
emitter.removeAllListeners();
console.log("names after clear:", emitter.eventNames().join("|"));
console.log("seen:", seen.join("|"));
