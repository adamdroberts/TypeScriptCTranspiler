import { EventEmitter, on } from "node:events";

async function breakWithPendingClose(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        break;
    }
    return "completed";
}

async function returnWithRejectedClose(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        return "body-return";
    }
    return "empty";
}

async function breakWithPrimitiveClose(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        break;
    }
    return "completed";
}

async function breakWithNoReturn(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        break;
    }
    return "completed";
}

const pendingClose = Promise.withResolvers<any>();
const pendingEmitter = new EventEmitter();
const pendingIterator: any = on(pendingEmitter, "data");
pendingIterator.return = (): Promise<any> => pendingClose.promise;
breakWithPendingClose(pendingIterator).then((value: string): void => {
    console.log("close-pending:", value);
});
pendingEmitter.emit("data", "pending");
console.log("close-pending-before-release");
setImmediate((): void => pendingClose.resolve({ done: true, value: undefined }));

const rejectedClose = Promise.withResolvers<any>();
const rejectedEmitter = new EventEmitter();
const rejectedIterator: any = on(rejectedEmitter, "data");
rejectedIterator.return = (): Promise<any> => rejectedClose.promise;
returnWithRejectedClose(rejectedIterator).then((value: string): void => {
    console.log("close-reject-unexpected:", value);
}, (reason: any): void => {
    console.log("close-reject:", reason);
});
rejectedEmitter.emit("data", "rejected");
setImmediate((): void => rejectedClose.reject("iterator-close-failure"));

const primitiveEmitter = new EventEmitter();
const primitiveIterator: any = on(primitiveEmitter, "data");
primitiveIterator.return = (): number => 42;
breakWithPrimitiveClose(primitiveIterator).then((value: string): void => {
    console.log("close-non-object-unexpected:", value);
}, (reason: any): void => {
    console.log("close-non-object:", reason);
});
primitiveEmitter.emit("data", "primitive");

let noReturnStep = 0;
const noReturnIterator: any = {
    next: (): Promise<any> => {
        if (noReturnStep++ === 0) return Promise.resolve({ done: false, value: "no-return" });
        return Promise.resolve({ done: true, value: undefined });
    },
};
breakWithNoReturn(noReturnIterator).then((value: string): void => {
    console.log("close-no-return:", value);
});
