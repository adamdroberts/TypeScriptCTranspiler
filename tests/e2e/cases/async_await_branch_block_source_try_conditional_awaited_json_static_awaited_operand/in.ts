import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function parseSource(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("json-static-bad");
    return delay(1, flag === 1 ? "{\"ok\":true}" : flag === 3 ? "false" : "not-json");
}

function stringifySource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 6) return Promise.reject("json-static-bad");
    return delay(1, flag === 1 ? { ok: true } : null);
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
        return JSON.parse(await parseSource(flag))
            ? await truthyArm("parse-true")
            : await falsyArm("parse-false");
    } catch (_reason) {
        return "caught-parse";
    }
}

class JsonStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return JSON.stringify(await stringifySource(flag))
                ? await truthyArm("stringify-true")
                : await falsyArm("stringify-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return JSON.parse(await parseSource(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (_reason) {
        return "caught-parse";
    } finally {
        trace += "V";
    }
};

const runner = new JsonStaticSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("parse-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("parse-false", valueResult, trace);
        trace = "";
        return declaration(4);
    })
    .then((valueResult) => {
        console.log("parse-invalid", valueResult, trace);
        trace = "";
        return declaration(6);
    })
    .then((valueResult) => {
        console.log("parse-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("stringify-true", valueResult, trace);
        trace = "";
        return runner.method(3);
    })
    .then((valueResult) => {
        console.log("stringify-null", valueResult, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((valueResult) => {
        console.log("stringify-reject", valueResult, trace);
        trace = "";
        return arrow(1);
    })
    .then((valueResult) => {
        console.log("arrow-true", valueResult, trace);
        trace = "";
        return arrow(3);
    })
    .then((valueResult) => {
        console.log("arrow-false", valueResult, trace);
        trace = "";
        return arrow(4);
    })
    .then((valueResult) => {
        console.log("arrow-invalid", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
    });
