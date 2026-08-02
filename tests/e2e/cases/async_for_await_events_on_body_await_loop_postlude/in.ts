import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        while (output.length === 0) {
            output.push("while");
            continue;
        }
        for (; output.length < 2;) {
            output.push("for");
            break;
        }
        do {
            output.push("do");
        } while (false);
        output.push("after");
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("loop-postlude:", value);
});
emitter.emit("data", "item");
