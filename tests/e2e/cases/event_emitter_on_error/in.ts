import { EventEmitter, on } from "events";

const pendingEmitter = new EventEmitter();
const pendingIterator: any = on(pendingEmitter, "data");
const pendingNext: Promise<any> = pendingIterator.next();
pendingEmitter.emit("error", "pending-error");
pendingNext.catch((reason: any) => {
    console.log("pending:", reason, pendingEmitter.listenerCount("data"), pendingEmitter.listenerCount("error"));
    pendingIterator.next().then((result: any) => {
        console.log("pending-after:", result.done);
        runEarlyError();
    });
});

function runEarlyError(): void {
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "data");
    emitter.emit("error", "early-error");
    iterator.next().catch((reason: any) => {
        console.log("early:", reason, emitter.listenerCount("data"), emitter.listenerCount("error"));
        iterator.next().then((result: any) => {
            console.log("early-after:", result.done);
            runQueuedError();
        });
    });
}

function runQueuedError(): void {
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "data");
    emitter.emit("data", "queued");
    emitter.emit("error", "queued-error");
    iterator.next().then((result: any) => {
        console.log("queued:", result.done, result.value[0], emitter.listenerCount("data"), emitter.listenerCount("error"));
        iterator.next().catch((reason: any) => {
            console.log("queued-error:", reason);
            iterator.next().then((after: any) => {
                console.log("queued-after:", after.done);
                runErrorEvent();
            });
        });
    });
}

function runErrorEvent(): void {
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "error");
    iterator.next().then((result: any) => {
        console.log("error-event:", result.done, result.value[0], emitter.listenerCount("error"));
        iterator.return().then((closed: any) => {
            console.log("error-event-closed:", closed.done, emitter.listenerCount("error"));
        });
    });
    emitter.emit("error", "as-data");
}
