import { EventEmitter, once } from "events";
import * as events from "node:events";

const first = new EventEmitter();
const firstReady = once(first, "ready", void 0);
first.emit("ready", "alpha", 1);
firstReady.then((args) => {
    console.log("undefined options:", args[0], args[1]);
});

const second = new events.EventEmitter();
const secondReady = events.once(second, "ready", { signal: void 0 });
second.emit("ready", "beta", 2);
secondReady.then((args) => {
    console.log("signal undefined:", args[0], args[1]);
});
