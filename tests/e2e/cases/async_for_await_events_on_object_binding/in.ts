import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const { 0: kind, 1: value } of iterator) {
        output.push(kind);
        output.push(value);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("object-binding:", value);
});
emitter.emit("data", "kind", "value");
