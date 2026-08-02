import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        switch (item[0] === "fall" ? 1 : item[0] === "middle" ? 2 : 3) {
            case 1:
                output.push("first");
            case 2:
                output.push("second");
                break;
            default:
                output.push("default");
        }
        output.push("after");
        break;
    }
    return output.join(",");
}

const fallEmitter = new EventEmitter();
const fallIterator: any = on(fallEmitter, "data");
collect(fallIterator, []).then((value: string): void => {
    console.log("switch-fallthrough:", value);

    const defaultEmitter = new EventEmitter();
    const defaultIterator: any = on(defaultEmitter, "data");
    collect(defaultIterator, []).then((defaultValue: string): void => {
        console.log("switch-default:", defaultValue);
    });
    defaultEmitter.emit("data", "other");
});
fallEmitter.emit("data", "fall");
