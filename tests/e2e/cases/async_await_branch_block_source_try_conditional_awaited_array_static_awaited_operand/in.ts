import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function sourceValue(flag: number): Promise<any> {
    trace += "L";
    if (flag === 6) return Promise.reject("array-static-bad");
    return delay(1, flag === 1 ? ["A", "B"] : "ab");
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function isArrayDeclaration(flag: number): Promise<string> {
    try {
        return Array.isArray(await sourceValue(flag))
            ? await truthyArm("is-array-true")
            : await falsyArm("is-array-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class ArrayStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return Array.of(await sourceValue(flag))
                ? await truthyArm("array-of-true")
                : await falsyArm("array-of-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Array.from(await sourceValue(flag))
            ? await truthyArm("array-from-true")
            : await falsyArm("array-from-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function fromAsyncDeclaration(flag: number): Promise<string> {
    try {
        return (Array.fromAsync(await sourceValue(flag)) as any)
            ? await truthyArm("array-from-async-true")
            : await falsyArm("array-from-async-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new ArrayStaticSelectorRunner();

isArrayDeclaration(1)
    .then((valueResult) => {
        console.log("is-array-true", valueResult, trace);
        trace = "";
        return isArrayDeclaration(3);
    })
    .then((valueResult) => {
        console.log("is-array-string", valueResult, trace);
        trace = "";
        return isArrayDeclaration(6);
    })
    .then((valueResult) => {
        console.log("is-array-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("array-of-true", valueResult, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((valueResult) => {
        console.log("array-of-reject", valueResult, trace);
        trace = "";
        return arrow(1);
    })
    .then((valueResult) => {
        console.log("array-from-true", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("array-from-reject", valueResult, trace);
        trace = "";
        return fromAsyncDeclaration(3);
    })
    .then((valueResult) => {
        console.log("array-from-async-true", valueResult, trace);
        trace = "";
        return fromAsyncDeclaration(6);
    })
    .then((valueResult) => {
        console.log("array-from-async-reject", valueResult, trace);
    });
