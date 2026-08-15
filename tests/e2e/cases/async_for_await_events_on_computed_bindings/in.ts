import { EventEmitter, on } from "node:events";

let keyCalls = 0;
const keyOrder: string[] = [];

function outerKey(): string {
    keyCalls++;
    keyOrder.push("outer");
    return "0";
}

function innerKey(): string {
    keyCalls++;
    keyOrder.push("inner");
    return "0";
}

function restKey(): string {
    keyCalls++;
    keyOrder.push("rest");
    return "0";
}

async function nested(iterator: any, output: string[]): Promise<string> {
    for await (const {
        [outerKey()]: { [innerKey()]: value = "leaf" } = { 0: "parent" },
    } of iterator) {
        output.push(value);
        break;
    }
    return output.join(",");
}

async function withRest(iterator: any, output: string[]): Promise<string> {
    for await (const { [restKey()]: value, ...rest } of iterator) {
        output.push(value);
        output.push(rest[1]);
        break;
    }
    return output.join(",");
}

const nestedEmitter = new EventEmitter();
const nestedIterator: any = on(nestedEmitter, "data");
nested(nestedIterator, []).then((nestedValue: string): void => {
    console.log("computed-nested:", nestedValue);

    const restEmitter = new EventEmitter();
    const restIterator: any = on(restEmitter, "data");
    withRest(restIterator, []).then((restValue: string): void => {
        console.log("computed-rest:", restValue);
        console.log("computed-key-calls:", keyCalls);
        console.log("computed-key-order:", keyOrder.join(","));
    });
    restEmitter.emit("data", "value", "tail");
});
nestedEmitter.emit("data", undefined);
