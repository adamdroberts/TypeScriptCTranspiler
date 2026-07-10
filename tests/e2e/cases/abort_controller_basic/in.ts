declare const AbortController: { new(): any };

const controller: any = new AbortController();
console.log("initial:", controller.signal.aborted, controller.signal.reason);
controller.abort("cancelled");
console.log("aborted:", controller.signal.aborted, controller.signal.reason);
controller.abort("ignored");
console.log("idempotent:", controller.signal.aborted, controller.signal.reason);
