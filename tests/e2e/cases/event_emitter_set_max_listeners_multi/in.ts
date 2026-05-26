import events, { EventEmitter, getMaxListeners, setMaxListeners } from "node:events";

const seen: string[] = [];

function count(n: number): number {
    seen.push("count:" + n);
    return n;
}

function emitter(label: string, value: EventEmitter): EventEmitter {
    seen.push(label);
    return value;
}

const a = new EventEmitter();
const b = new EventEmitter();
const c = new events.EventEmitter();

setMaxListeners(count(4), emitter("a", a), emitter("b", b));
events.setMaxListeners(count(6), emitter("c", c), emitter("a2", a));

console.log("limits:", getMaxListeners(a), getMaxListeners(b), events.getMaxListeners(c));
console.log("seen:", seen.join("|"));
