import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function btoaValue(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("base64-bad");
    return delay(1, flag === 1 ? "Hello" : "");
}

function atobValue(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("base64-bad");
    return delay(1, flag === 1 ? "SGVsbG8=" : "");
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
        return btoa(await btoaValue(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class Base64SelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return btoa(await btoaValue(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return btoa(await btoaValue(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function decodeBase64(flag: number): Promise<string> {
    try {
        return atob(await atobValue(flag))
            ? await truthyArm("decode-true")
            : await falsyArm("decode-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new Base64SelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-empty-base64", valueResult, trace);
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
        console.log("method-empty-base64", valueResult, trace);
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
        console.log("arrow-empty-base64", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return decodeBase64(1);
    })
    .then((valueResult) => {
        console.log("decode-true", valueResult, trace);
        trace = "";
        return decodeBase64(3);
    })
    .then((valueResult) => {
        console.log("decode-empty-base64", valueResult, trace);
        trace = "";
        return decodeBase64(6);
    })
    .then((valueResult) => {
        console.log("decode-reject", valueResult, trace);
    });
