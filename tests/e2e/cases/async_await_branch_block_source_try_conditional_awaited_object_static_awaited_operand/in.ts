import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function objectSource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 6) return Promise.reject("object-static-bad");
    return delay(1, flag === 1 ? 0 : flag === 2 ? NaN : 1);
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
        return Object.is(await objectSource(flag), 0)
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (_reason) {
        return "caught-declaration";
    }
}

class ObjectStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return Object.is(await objectSource(flag), 0)
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Object.is(await objectSource(flag), NaN)
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (_reason) {
        return "caught-arrow";
    } finally {
        trace += "V";
    }
};

const runner = new ObjectStaticSelectorRunner();

declaration(1)
    .then((value) => {
        console.log("declaration-true", value, trace);
        trace = "";
        return declaration(3);
    })
    .then((value) => {
        console.log("declaration-false", value, trace);
        trace = "";
        return declaration(6);
    })
    .then((value) => {
        console.log("declaration-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-true", value, trace);
        trace = "";
        return runner.method(3);
    })
    .then((value) => {
        console.log("method-false", value, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        trace = "";
        return arrow(2);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        trace = "";
        return arrow(3);
    })
    .then((value) => {
        console.log("arrow-false", value, trace);
        trace = "";
        return arrow(6);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
    });
