import { EventEmitter, once } from "events";
import * as events from "node:events";

let ignoredSeen = "";
function mark(label: string): string {
    ignoredSeen += label;
    return label;
}

const first = new EventEmitter();
const firstReady = once(first, "ready", void mark("o"), mark("a"));
first.emit("ready", "alpha", 1);
firstReady.then((args) => {
    console.log("undefined options:", args[0], args[1]);
});

const second = new events.EventEmitter();
const ONCE_OPTIONS = { signal: void 0 } as const;
const secondReady = events.once(second, "ready", ONCE_OPTIONS, mark("b"));
second.emit("ready", "beta", 2);
secondReady.then((args) => {
    console.log("signal undefined:", args[0], args[1]);
});

const third = new EventEmitter();
const thirdReady = once(third, "ready", { signal: mark("s") });
console.log("signal listener before:", third.listenerCount("ready"));
third.emit("ready", "gamma", 3);
console.log("signal listener after:", third.listenerCount("ready"));

console.log("ignored:", ignoredSeen);
