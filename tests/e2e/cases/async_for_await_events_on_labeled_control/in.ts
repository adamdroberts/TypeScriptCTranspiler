import { EventEmitter, on } from "node:events";

async function consume(iterator: any, output: string[]): Promise<string> {
    outer: for await (const item of iterator) {
        output.push("seen:" + item[0]);
        if (item[0] === "skip") {
            continue outer;
        } else {
            break outer;
        }
    }
    return output.join("|");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
const output: string[] = [];
consume(iterator, output).then((value: string): void => {
    console.log(value + "|closed");
    console.log("listeners:", emitter.listenerCount("data"));
});
emitter.emit("data", "skip");
emitter.emit("data", "stop");
