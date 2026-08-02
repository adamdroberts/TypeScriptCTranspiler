import { EventEmitter, on } from "events";

const manualEmitter = new EventEmitter();
const pausedEmitter = manualEmitter.pause();
console.log("manual-paused:", pausedEmitter === manualEmitter, manualEmitter.isPaused());
const resumedEmitter = pausedEmitter.resume();
console.log("manual-resumed:", resumedEmitter === manualEmitter, manualEmitter.isPaused());

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data", { highWaterMark: 1, lowWaterMark: 1 });

emitter.emit("data", "one");
emitter.emit("data", "two");
console.log("after-buffer:", emitter.isPaused());

iterator.next().then((first: any) => {
    console.log("first:", first.done, first.value[0], emitter.isPaused());
    iterator.next().then((second: any) => {
        console.log("second:", second.done, second.value[0], emitter.isPaused());
        iterator.return().then(() => runReturnCleanup());
    });
});

function runReturnCleanup(): void {
    const cleanupEmitter = new EventEmitter();
    const cleanupIterator: any = on(cleanupEmitter, "data", { highWaterMark: 1, lowWaterMark: 1 });
    cleanupEmitter.emit("data", "one");
    cleanupEmitter.emit("data", "two");
    console.log("before-return:", cleanupEmitter.isPaused());
    cleanupIterator.return().then((result: any) => {
        console.log("after-return:", result.done, cleanupEmitter.isPaused());
    });
}
