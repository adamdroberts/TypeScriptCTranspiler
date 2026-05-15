import { EventEmitter, getEventListeners, listenerCount } from "events";
import * as nodeEvents from "node:events";

const emitter = new EventEmitter();
const seen: string[] = [];

function named(label: string): void {
    seen.push("named:" + label);
}

function early(label: string): void {
    seen.push("early:" + label);
}

emitter.on("data", named);
emitter.prependListener("data", early);
emitter.once("data", named);

const first = emitter.listeners("data");
const fromModule = getEventListeners(emitter, "data");
const fromNamespace = nodeEvents.getEventListeners(emitter, "data");

console.log("lengths:", first.length, fromModule.length, fromNamespace.length);
console.log("types:", typeof first[0], typeof first[1], first.join("|"));
console.log("same list:", Object.is(first[0], fromModule[0]), Object.is(first[1], first[2]));
console.log("module filtered:", listenerCount(emitter, "data", named));
console.log("namespace filtered:", nodeEvents.listenerCount(emitter, "data", named), Object.is(fromNamespace[2], fromModule[2]));

first.push("extra");
console.log("copy:", first.length, emitter.listenerCount("data"));

console.log("emit:", emitter.emit("data", "x"));
console.log("seen:", seen.join("|"));

const after = emitter.listeners("data");
console.log("after once:", after.length, Object.is(after[1], fromModule[1]));
console.log("missing:", getEventListeners(emitter, "missing").length);
