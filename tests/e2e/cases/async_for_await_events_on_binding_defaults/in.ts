import { EventEmitter, on } from "node:events";

async function arrayDefault(iterator: any, output: string[]): Promise<string> {
    for await (const [kind = "fallback-kind", value = "fallback-value"] of iterator) {
        output.push(kind);
        output.push(value);
        break;
    }
    return output.join(",");
}

async function objectDefault(iterator: any, output: string[]): Promise<string> {
    for await (const { 0: kind = "fallback-kind", 1: value = "fallback-value" } of iterator) {
        output.push(kind);
        output.push(value);
        break;
    }
    return output.join(",");
}

const arrayEmitter = new EventEmitter();
const arrayIterator: any = on(arrayEmitter, "data");
arrayDefault(arrayIterator, []).then((value: string): void => {
    console.log("array-default:", value);

    const objectEmitter = new EventEmitter();
    const objectIterator: any = on(objectEmitter, "data");
    objectDefault(objectIterator, []).then((objectValue: string): void => {
        console.log("object-default:", objectValue);
    });
    objectEmitter.emit("data", "kind");
});
arrayEmitter.emit("data", "kind");
