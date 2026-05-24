import { EventEmitter as ImportedEventEmitter, defaultMaxListeners } from "events";
import * as nodeEvents from "node:events";

const before = new EventEmitter();
console.log("initial:", ImportedEventEmitter.defaultMaxListeners, defaultMaxListeners, before.getMaxListeners());

ImportedEventEmitter.defaultMaxListeners = 3;

const afterGlobal = new EventEmitter();
console.log("global:", EventEmitter.defaultMaxListeners, nodeEvents.defaultMaxListeners, before.getMaxListeners(), afterGlobal.getMaxListeners());

before.setMaxListeners(9);
EventEmitter.defaultMaxListeners = 4;

const afterOwn = new EventEmitter();
console.log("own:", before.getMaxListeners(), afterGlobal.getMaxListeners(), afterOwn.getMaxListeners());

nodeEvents.EventEmitter.defaultMaxListeners = 5;

const afterNamespace = new nodeEvents.EventEmitter();
console.log("namespace:", EventEmitter.defaultMaxListeners, nodeEvents.EventEmitter.defaultMaxListeners, afterGlobal.getMaxListeners(), afterNamespace.getMaxListeners());
