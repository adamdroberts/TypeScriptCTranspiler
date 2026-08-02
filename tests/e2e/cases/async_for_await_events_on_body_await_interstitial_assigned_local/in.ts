import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        let marker: string;
        marker = item[0];
        await Promise.resolve(marker);
        output.push(marker);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("interstitial-assigned-local:", value);
});
emitter.emit("data", "item");
