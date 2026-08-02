import { EventEmitter, on } from "node:events";

function rejectConditionValue(): Promise<boolean> {
    return Promise.reject("prefix-condition-failure");
}

async function prefixCondition(iterator: any, output: string[]): Promise<string> {
    for await (const _item of iterator) {
        await Promise.resolve(output.length);
        if (await Promise.resolve(output.length === 1)) {
            output.push("stop");
            break;
        } else {
            output.push("keep");
            continue;
        }
    }
    return output.join(",");
}

async function prefixConditionReject(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        await Promise.resolve(0);
        if (await rejectConditionValue()) {
            break;
        } else {
            continue;
        }
    }
    return "fulfilled";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
prefixCondition(iterator, []).then((value: string): void => {
    console.log("body-await-prefix-condition:", value);
});
emitter.emit("data", "keep");
emitter.emit("data", "stop");

const rejectionEmitter = new EventEmitter();
const rejectionIterator: any = on(rejectionEmitter, "data");
prefixConditionReject(rejectionIterator).then((value: string): void => {
    console.log("body-await-prefix-condition-unexpected:", value);
}, (reason: any): void => {
    console.log("body-await-prefix-condition-reject:", reason);
});
rejectionEmitter.emit("data", "ignored");
