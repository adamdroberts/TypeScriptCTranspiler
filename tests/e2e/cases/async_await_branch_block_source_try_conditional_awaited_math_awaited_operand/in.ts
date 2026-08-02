import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function floorValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("math-bad");
    return delay(1, flag === 1 ? 2.7 : 0);
}

function absValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("math-bad");
    return delay(1, flag === 1 ? -2.7 : 0);
}

function sqrtValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("math-bad");
    return delay(1, flag === 1 ? 4 : 0);
}

function signValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("math-bad");
    return delay(1, flag === 1 ? -1 : 0);
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
        return Math.floor(await floorValue(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class MathSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return Math.abs(await absValue(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Math.sqrt(await sqrtValue(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function signDeclaration(flag: number): Promise<string> {
    try {
        return Math.sign(await signValue(flag))
            ? await truthyArm("sign-true")
            : await falsyArm("sign-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new MathSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-zero", valueResult, trace);
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
        console.log("method-zero", valueResult, trace);
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
        console.log("arrow-zero", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return signDeclaration(1);
    })
    .then((valueResult) => {
        console.log("sign-true", valueResult, trace);
        trace = "";
        return signDeclaration(3);
    })
    .then((valueResult) => {
        console.log("sign-zero", valueResult, trace);
        trace = "";
        return signDeclaration(6);
    })
    .then((valueResult) => {
        console.log("sign-reject", valueResult, trace);
    });
