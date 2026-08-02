import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(output.push(item));
        break;
    }
    return output.join(",");
}

async function rejectBody(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        await Promise.reject("body-failure");
        break;
    }
    return "fulfilled";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("body-await:", value);

    const rejectionEmitter = new EventEmitter();
    const rejectionIterator: any = on(rejectionEmitter, "data");
    rejectBody(rejectionIterator).then((value: string): void => {
        console.log("body-reject-unexpected:", value);
    }, (reason: any): void => {
        console.log("body-reject:", reason);
    });
    rejectionEmitter.emit("data", "ignored");
});
emitter.emit("data", "first");
