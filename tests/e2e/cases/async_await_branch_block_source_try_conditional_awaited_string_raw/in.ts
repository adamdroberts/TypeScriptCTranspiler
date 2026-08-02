import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function rawTemplate(flag: number): Promise<any> {
    trace += "L";
    if (flag === 9) return Promise.reject("raw-bad");
    return delay(1, { raw: ["", ""] } as any);
}

function substitution(flag: number): string {
    trace += "S";
    return flag === 1 ? "ok" : "";
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

async function declaration(flag: number): Promise<string> {
    try {
        return String.raw(await rawTemplate(flag), substitution(flag))
            ? await truthyArm("declaration-true")
            : "declaration-false";
    } catch (_reason) {
        return "caught-declaration";
    }
}

class StringRawRunner {
    async method(flag: number): Promise<string> {
        try {
            return String.raw(await rawTemplate(flag), substitution(flag))
                ? await truthyArm("method-true")
                : "method-false";
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return String.raw(await rawTemplate(flag), substitution(flag))
            ? await truthyArm("arrow-true")
            : "arrow-false";
    } catch (_reason) {
        return "caught-arrow";
    } finally {
        trace += "V";
    }
};

const runner = new StringRawRunner();

declaration(1)
    .then((value) => {
        console.log("declaration-true", value, trace);
        trace = "";
        return declaration(2);
    })
    .then((value) => {
        console.log("declaration-false", value, trace);
        trace = "";
        return declaration(9);
    })
    .then((value) => {
        console.log("declaration-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-true", value, trace);
        trace = "";
        return runner.method(9).then(
            (result) => "unexpected-" + result,
            (_reason) => "rejected-method",
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        trace = "";
        return arrow(1);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        trace = "";
        return arrow(9);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
    });
