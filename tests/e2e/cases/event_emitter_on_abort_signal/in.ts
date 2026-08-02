declare const AbortController: { new(): any };

import { EventEmitter, on } from "events";

const pendingController: any = new AbortController();
const pendingEmitter = new EventEmitter();
const pendingIterator: any = on(pendingEmitter, "data", { signal: pendingController.signal });
const pendingNext: Promise<any> = pendingIterator.next();
pendingController.abort("pending-cancelled");
pendingNext.catch((reason: any) => {
    console.log("pending:", reason, pendingEmitter.listenerCount("data"), pendingEmitter.listenerCount("error"));
    pendingIterator.next().then((result: any) => {
        console.log("pending-after:", result.done);
        runQueued();
    });
});

function runQueued(): void {
    const queuedController: any = new AbortController();
    const queuedEmitter = new EventEmitter();
    const queuedIterator: any = on(queuedEmitter, "data", { signal: queuedController.signal });
    queuedEmitter.emit("data", "queued");
    queuedController.abort("queued-cancelled");
    queuedIterator.next().then((result: any) => {
        console.log("queued:", result.done, result.value[0], queuedEmitter.listenerCount("data"), queuedEmitter.listenerCount("error"));
        queuedIterator.next().catch((reason: any) => {
            console.log("queued-abort:", reason);
            queuedIterator.next().then((after: any) => {
                console.log("queued-after:", after.done);
                runPreAborted();
            });
        });
    });
}

function runPreAborted(): void {
    const controller: any = new AbortController();
    controller.abort("pre-cancelled");
    const emitter = new EventEmitter();
    const iterator: any = on(emitter, "data", { signal: controller.signal });
    iterator.next().catch((reason: any) => {
        console.log("pre:", reason, emitter.listenerCount("data"), emitter.listenerCount("error"));
    });
}
