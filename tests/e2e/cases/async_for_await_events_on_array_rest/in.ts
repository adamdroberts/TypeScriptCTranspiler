import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const [first, ...rest] of iterator) {
        output.push(first);
        output.push(rest[0]);
        output.push(rest[1]);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("array-rest:", value);
});
emitter.emit("data", "first", "second", "third");
