import { EventEmitter, on } from "node:events";

async function returnFirst(iterator: any): Promise<string> {
    for await (const item of iterator) {
        return item[0];
    }
    return "empty";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
returnFirst(iterator).then((value: string): void => {
    console.log("return:", value);
    iterator.next().then((step: any): void => {
        console.log("closed:", step.done ? "yes" : "no");
    });
    emitter.emit("data", "late");
});
emitter.emit("data", "first");
