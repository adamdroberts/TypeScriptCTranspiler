import { EventEmitter, getMaxListeners, setMaxListeners } from "events";
import * as nodeEvents from "node:events";

let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}
const emitter = new EventEmitter(mark("c"));
const other = new nodeEvents.EventEmitter(mark("n"));

console.log("default:", emitter.getMaxListeners());
console.log("chain:", emitter.setMaxListeners(2).getMaxListeners());
setMaxListeners(4, emitter);
console.log("static:", getMaxListeners(emitter, mark("m")));
nodeEvents.setMaxListeners(6, other);
console.log("namespace:", nodeEvents.getMaxListeners(other, mark("k")));
console.log("ignored:", emitter.getMaxListeners(mark("g")), other.getMaxListeners(mark("h")), ignoredSeen);
