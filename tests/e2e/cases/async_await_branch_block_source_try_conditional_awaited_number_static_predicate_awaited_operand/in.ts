import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function finiteValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("number-static-bad");
    return delay(1, flag === 1 ? 7.5 : Infinity);
}

function nanValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("number-static-bad");
    return delay(1, flag === 1 ? NaN : 7.5);
}

function integerValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("number-static-bad");
    return delay(1, flag === 1 ? 7 : 7.5);
}

function safeIntegerValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("number-static-bad");
    return delay(1, flag === 1 ? 7 : 1e20);
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function declaration(flag: number): Promise<string> {
    try {
        return Number.isFinite(await finiteValue(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NumberStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return Number.isNaN(await nanValue(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Number.isInteger(await integerValue(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function safeIntegerDeclaration(flag: number): Promise<string> {
    try {
        return Number.isSafeInteger(await safeIntegerValue(flag))
            ? await truthyArm("safe-true")
            : await falsyArm("safe-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new NumberStaticSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-infinite", valueResult, trace);
        trace = "";
        return declaration(6);
    })
    .then((valueResult) => {
        console.log("declaration-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("method-true", valueResult, trace);
        trace = "";
        return runner.method(3);
    })
    .then((valueResult) => {
        console.log("method-number", valueResult, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((valueResult) => {
        console.log("method-reject", valueResult, trace);
        trace = "";
        return arrow(1);
    })
    .then((valueResult) => {
        console.log("arrow-true", valueResult, trace);
        trace = "";
        return arrow(3);
    })
    .then((valueResult) => {
        console.log("arrow-number", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return safeIntegerDeclaration(1);
    })
    .then((valueResult) => {
        console.log("safe-true", valueResult, trace);
        trace = "";
        return safeIntegerDeclaration(3);
    })
    .then((valueResult) => {
        console.log("safe-large", valueResult, trace);
        trace = "";
        return safeIntegerDeclaration(6);
    })
    .then((valueResult) => {
        console.log("safe-reject", valueResult, trace);
    });
