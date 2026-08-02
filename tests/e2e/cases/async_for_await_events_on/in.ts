declare const AbortController: { new(): any };
import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        output.push(item[0]);
        iterator.return();
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
const output: string[] = [];
collect(iterator, output).then((value: string): void => {
    console.log("result:", value);
});
emitter.emit("data", "alpha");

const abortedEmitter = new EventEmitter();
const abortController: any = new AbortController();
const abortedIterator: any = on(abortedEmitter, "data", { signal: abortController.signal });
collect(abortedIterator, []).catch((reason: any): void => {
    console.log("abort:", reason);
});
abortController.abort("for-await-cancelled");
