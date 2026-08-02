import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function left(flag: number): Promise<boolean> {
    trace += "L";
    if (flag === 6) return Promise.reject("left-bad");
    return delay(1, flag !== 3 && flag !== 7);
}

function fallback(flag: number): Promise<string> {
    trace += "F";
    if (flag === 7) return Promise.reject("fallback-bad");
    return delay(2, "fallback");
}

async function declaration(flag: number): Promise<string> {
    try {
        return String(await left(flag))
            ? await delay(3, "declaration-true")
            : await fallback(flag);
    } catch (reason) {
        return "caught-" + reason;
    }
}

class AwaitedCoercionRunner {
    async numberMethod(flag: number): Promise<string> {
        try {
            return Number(await left(flag))
                ? await delay(5, "number-true")
                : await fallback(flag);
        } finally {
            trace += "N";
        }
    }

    async bigintMethod(flag: number): Promise<string> {
        try {
            return BigInt(await left(flag))
                ? await delay(7, "bigint-true")
                : await fallback(flag);
        } finally {
            trace += "B";
        }
    }
}

const runner = new AwaitedCoercionRunner();

const arrow = async (flag: number): Promise<string> => {
    try {
        return Boolean(await left(flag))
            ? await delay(9, "boolean-true")
            : await fallback(flag);
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

declaration(1)
    .then((value) => {
        console.log("declaration-string-true", value, trace);
        trace = "";
        return declaration(3);
    })
    .then((value) => {
        console.log("declaration-string-false", value, trace);
        trace = "";
        return declaration(6);
    })
    .then((value) => {
        console.log("declaration-left-reject", value, trace);
        trace = "";
        return runner.numberMethod(1);
    })
    .then((value) => {
        console.log("number-true", value, trace);
        trace = "";
        return runner.numberMethod(3);
    })
    .then((value) => {
        console.log("number-false", value, trace);
        trace = "";
        return runner.numberMethod(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("number-left-reject", value, trace);
        trace = "";
        return runner.numberMethod(7).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("number-fallback-reject", value, trace);
        trace = "";
        return runner.bigintMethod(1);
    })
    .then((value) => {
        console.log("bigint-true", value, trace);
        trace = "";
        return runner.bigintMethod(3);
    })
    .then((value) => {
        console.log("bigint-false", value, trace);
        trace = "";
        return runner.bigintMethod(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("bigint-left-reject", value, trace);
        trace = "";
        return runner.bigintMethod(7).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("bigint-fallback-reject", value, trace);
        trace = "";
        return arrow(1);
    })
    .then((value) => {
        console.log("boolean-true", value, trace);
        trace = "";
        return arrow(3);
    })
    .then((value) => {
        console.log("boolean-false", value, trace);
        trace = "";
        return arrow(6);
    })
    .then((value) => {
        console.log("boolean-left-reject", value, trace);
        trace = "";
        return arrow(7);
    })
    .then((value) => console.log("boolean-fallback-reject", value, trace));
