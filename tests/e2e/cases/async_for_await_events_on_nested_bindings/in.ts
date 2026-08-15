import { EventEmitter, on } from "node:events";

let fallbackCalls = 0;

function arrayFallback(): any {
    fallbackCalls++;
    return ["array-kind-parent", "array-value-parent"];
}

function objectFallback(): any {
    fallbackCalls++;
    return ["object-first-parent", "object-second-parent"];
}

async function arrayNested(iterator: any, output: string[]): Promise<string> {
    for await (const [
        { 0: kind = "array-kind-leaf", 1: value = "array-value-leaf" } = arrayFallback(),
        { 0: label = "array-label-leaf", ...tail } = ["array-label-parent", "array-tail"],
    ] of iterator) {
        output.push(kind);
        output.push(value);
        output.push(label);
        output.push(tail[1]);
        break;
    }
    return output.join(",");
}

async function objectNested(iterator: any, output: string[]): Promise<string> {
    for await (const {
        0: { 0: first = "object-first-leaf", ...tail } = objectFallback(),
        1: { 0: third = "object-third-leaf" } = ["object-third-parent"],
    } of iterator) {
        output.push(first);
        output.push(tail[1]);
        output.push(third);
        break;
    }
    return output.join(",");
}

async function leafDefaults(iterator: any, output: string[]): Promise<string> {
    for await (const [
        { 0: kind = "leaf-kind", 1: value = "leaf-value" },
        { 0: label = "leaf-label" },
    ] of iterator) {
        output.push(kind);
        output.push(value);
        output.push(label);
        break;
    }
    return output.join(",");
}

const arrayEmitter = new EventEmitter();
const arrayIterator: any = on(arrayEmitter, "data");
arrayNested(arrayIterator, []).then((arrayValue: string): void => {
    console.log("array-nested:", arrayValue);

    const objectEmitter = new EventEmitter();
    const objectIterator: any = on(objectEmitter, "data");
    objectNested(objectIterator, []).then((objectValue: string): void => {
        console.log("object-nested:", objectValue);

        const leafEmitter = new EventEmitter();
        const leafIterator: any = on(leafEmitter, "data");
        leafDefaults(leafIterator, []).then((leafValue: string): void => {
            console.log("leaf-defaults:", leafValue);
            console.log("fallback-calls:", fallbackCalls);
        });
        leafEmitter.emit("data", [undefined, undefined], [undefined]);
    });
    objectEmitter.emit("data", undefined, undefined);
});
arrayEmitter.emit("data", undefined, undefined);
