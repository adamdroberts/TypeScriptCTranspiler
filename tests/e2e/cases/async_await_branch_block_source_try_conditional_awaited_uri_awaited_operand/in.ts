import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function value(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("uri-bad");
    return delay(1, flag === 1 ? "a%20b" : "");
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
        return encodeURI(await value(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class UriSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return encodeURIComponent(await value(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return decodeURI(await value(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function decodeComponent(flag: number): Promise<string> {
    try {
        return decodeURIComponent(await value(flag))
            ? await truthyArm("component-true")
            : await falsyArm("component-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new UriSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-empty-uri", valueResult, trace);
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
        console.log("method-empty-uri", valueResult, trace);
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
        console.log("arrow-empty-uri", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return decodeComponent(1);
    })
    .then((valueResult) => {
        console.log("component-true", valueResult, trace);
        trace = "";
        return decodeComponent(3);
    })
    .then((valueResult) => {
        console.log("component-empty-uri", valueResult, trace);
        trace = "";
        return decodeComponent(6);
    })
    .then((valueResult) => console.log("component-reject", valueResult, trace));
