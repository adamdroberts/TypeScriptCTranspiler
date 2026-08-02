import { EventEmitter, on } from "node:events";

async function awaitPrefixReturn(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        if (item[0] === "return") return item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

async function awaitPrefixThrow(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        if (item[0] === "throw") throw item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

async function awaitConditionReturn(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        if (await Promise.resolve(item[0] === "condition-return")) return item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

async function awaitConditionThrow(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        if (await Promise.resolve(item[0] === "condition-throw")) throw item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

const returnEmitter = new EventEmitter();
const returnIterator: any = on(returnEmitter, "data");
awaitPrefixReturn(returnIterator, []).then((value: string): void => {
    console.log("await-prefix-return:", value);

    const throwEmitter = new EventEmitter();
    const throwIterator: any = on(throwEmitter, "data");
    awaitPrefixThrow(throwIterator, []).then((value: string): void => {
        console.log("await-prefix-throw-unexpected:", value);
    }, (reason: any): void => {
        console.log("await-prefix-throw:", reason);

        const conditionReturnEmitter = new EventEmitter();
        const conditionReturnIterator: any = on(conditionReturnEmitter, "data");
        awaitConditionReturn(conditionReturnIterator, []).then((value: string): void => {
            console.log("await-condition-return:", value);

            const conditionThrowEmitter = new EventEmitter();
            const conditionThrowIterator: any = on(conditionThrowEmitter, "data");
            awaitConditionThrow(conditionThrowIterator, []).then((value: string): void => {
                console.log("await-condition-throw-unexpected:", value);
            }, (conditionReason: any): void => {
                console.log("await-condition-throw:", conditionReason);
            });
            conditionThrowEmitter.emit("data", "condition-keep");
            conditionThrowEmitter.emit("data", "condition-throw");
        });
        conditionReturnEmitter.emit("data", "condition-keep");
        conditionReturnEmitter.emit("data", "condition-return");
    });
    throwEmitter.emit("data", "throw-keep");
    throwEmitter.emit("data", "throw");
});
returnEmitter.emit("data", "return-keep");
returnEmitter.emit("data", "return");
