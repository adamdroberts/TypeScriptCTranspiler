import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function values(flag: number): Promise<string[]> {
    trace += "L";
    if (flag === 6) return Promise.reject("aggregate-bad");
    return delay(1, flag === 1 ? ["selected"] : []);
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
        return AggregateError(await values(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class AggregateErrorSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return AggregateError(await values(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return AggregateError(await values(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new AggregateErrorSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-empty-values", valueResult, trace);
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
        console.log("method-empty-values", valueResult, trace);
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
        console.log("arrow-empty-values", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => console.log("arrow-reject", valueResult, trace));
