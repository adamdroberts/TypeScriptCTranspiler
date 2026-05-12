import { EventEmitter, getMaxListeners, setMaxListeners } from "events";
import * as nodeEvents from "node:events";

const emitter = new EventEmitter();
const other = new nodeEvents.EventEmitter();

console.log("default:", emitter.getMaxListeners());
console.log("chain:", emitter.setMaxListeners(2).getMaxListeners());
setMaxListeners(4, emitter);
console.log("static:", getMaxListeners(emitter));
nodeEvents.setMaxListeners(6, other);
console.log("namespace:", nodeEvents.getMaxListeners(other));
