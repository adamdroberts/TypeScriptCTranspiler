import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        const first = item[0];
        await Promise.resolve(first);
        let second: string;
        second = first + "-second";
        await Promise.resolve(second);
        const third = second + "-third";
        await Promise.resolve(third);
        const fourth = third + "-fourth";
        await Promise.resolve(fourth);
        output.push(fourth);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("body-five-awaits:", value);
});
emitter.emit("data", "item");
