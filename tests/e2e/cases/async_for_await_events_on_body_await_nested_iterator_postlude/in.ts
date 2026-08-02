import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        for (const value of ["nested"]) {
            output.push("of:" + value);
            break;
        }
        for (const key in { nested: true }) {
            output.push("in:" + key);
            break;
        }
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("nested-iterators:", value);
});
emitter.emit("data", "item");
