import { EventEmitter, on } from "node:events";

async function returnParameter(iterator: any, item: any): Promise<string> {
    for await (item of iterator) {
        return item[0];
    }
    return item;
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
returnParameter(iterator, "initial").then((value: string): void => {
    console.log("parameter:", value);
});
emitter.emit("data", "bound");
