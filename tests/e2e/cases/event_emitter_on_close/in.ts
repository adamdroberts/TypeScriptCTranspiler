import { EventEmitter, on } from "events";

const pendingEmitter = new EventEmitter();
const pendingIterator: any = on(pendingEmitter, "data", { close: ["close"] });
const pendingNext: Promise<any> = pendingIterator.next();
pendingEmitter.emit("close", "stop");
pendingNext.then((result: any) => {
    console.log("pending:", result.done, pendingEmitter.listenerCount("data"), pendingEmitter.listenerCount("close"), pendingEmitter.listenerCount("error"));
    pendingIterator.next().then((after: any) => {
        console.log("pending-after:", after.done);
        runQueuedClose();
    });
});

function runQueuedClose(): void {
    const closeNames: string[] = ["close"];
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "data", { close: closeNames });
    emitter.emit("data", "queued");
    emitter.emit("close", "stop");
    iterator.next().then((result: any) => {
        console.log("queued:", result.done, result.value[0], emitter.listenerCount("data"), emitter.listenerCount("close"), emitter.listenerCount("error"));
        iterator.next().then((after: any) => {
            console.log("queued-after:", after.done);
            runSelectedCloseEvent();
        });
    });
}

function runSelectedCloseEvent(): void {
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "close", { close: ["close"] });
    const next: Promise<any> = iterator.next();
    emitter.emit("close", "as-data");
    next.then((result: any) => {
        console.log("selected:", result.done, result.value[0], emitter.listenerCount("close"));
    });
}
