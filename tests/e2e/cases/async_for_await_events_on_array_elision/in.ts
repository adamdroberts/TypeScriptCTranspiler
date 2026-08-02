import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const [, second, , fourth] of iterator) {
        output.push(second);
        output.push(fourth);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("array-elision:", value);
});
emitter.emit("data", "first", "second", "third", "fourth");
