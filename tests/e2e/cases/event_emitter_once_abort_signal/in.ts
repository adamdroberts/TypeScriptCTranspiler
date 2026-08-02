declare const AbortController: { new(): any };
import { EventEmitter, once } from "node:events";

const pending = new EventEmitter();
const pendingController: any = new AbortController();
const pendingPromise = once(pending, "ready", { signal: pendingController.signal });
pendingPromise.catch((reason: any): void => {
    console.log("pending:", reason, pending.listenerCount("ready"), pending.listenerCount("error"));
});
pendingController.abort("pending-cancelled");

const pre = new EventEmitter();
const preController: any = new AbortController();
preController.abort("pre-cancelled");
const prePromise = once(pre, "ready", { signal: preController.signal });
prePromise.catch((reason: any): void => {
    console.log("pre:", reason, pre.listenerCount("ready"), pre.listenerCount("error"));
});

const winner = new EventEmitter();
const winnerController: any = new AbortController();
const winnerPromise = once(winner, "ready", { signal: winnerController.signal });
winnerPromise.then((args: any[]): void => {
    console.log("event:", args[0], winner.listenerCount("ready"), winner.listenerCount("error"));
    winnerController.abort("late-cancelled");
    console.log("late:", winner.listenerCount("ready"), winner.listenerCount("error"));
});
winner.emit("ready", "delivered");

const errorWinner = new EventEmitter();
const errorController: any = new AbortController();
const errorPromise = once(errorWinner, "ready", { signal: errorController.signal });
errorPromise.catch((reason: any): void => {
    console.log("error:", reason, errorWinner.listenerCount("ready"), errorWinner.listenerCount("error"));
    errorController.abort("late-error-cancelled");
    console.log("error-late:", errorWinner.listenerCount("ready"), errorWinner.listenerCount("error"));
});
errorWinner.emit("error", "error-delivered");
