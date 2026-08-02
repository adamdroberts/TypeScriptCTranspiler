import { EventEmitter, on } from "node:events";

async function throwFirst(iterator: any): Promise<string> {
    for await (const item of iterator) {
        throw item[0];
    }
    return "empty";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
throwFirst(iterator).catch((reason: any): void => {
    console.log("throw:", reason);
    iterator.next().then((step: any): void => {
        console.log("closed:", step.done ? "yes" : "no");
    });
    emitter.emit("data", "late");
});
emitter.emit("data", "first");
