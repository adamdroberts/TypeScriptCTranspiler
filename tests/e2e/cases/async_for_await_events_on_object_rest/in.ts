import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const { 0: first, ...rest } of iterator) {
        output.push(first);
        output.push(rest["1"]);
        output.push(rest["2"]);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("object-rest:", value);
});
emitter.emit("data", "first", "second", "third");
