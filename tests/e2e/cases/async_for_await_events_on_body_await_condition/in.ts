import { EventEmitter, on } from "node:events";

function rejectConditionValue(): Promise<boolean> {
    return Promise.reject("condition-failure");
}

async function conditionBranch(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        if (await Promise.resolve(item[0] === "stop")) {
            output.push("stop");
            break;
        } else {
            output.push("keep");
            continue;
        }
    }
    return output.join(",");
}

async function rejectCondition(iterator: any): Promise<string> {
    for await (const _item of iterator) {
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
conditionBranch(iterator, []).then((value: string): void => {
    console.log("body-await-if-condition:", value);
});
emitter.emit("data", "keep");
emitter.emit("data", "stop");

const rejectionEmitter = new EventEmitter();
const rejectionIterator: any = on(rejectionEmitter, "data");
rejectCondition(rejectionIterator).then((value: string): void => {
    console.log("body-await-if-condition-unexpected:", value);
}, (reason: any): void => {
    console.log("body-await-if-condition-reject:", reason);
});
rejectionEmitter.emit("data", "ignored");
