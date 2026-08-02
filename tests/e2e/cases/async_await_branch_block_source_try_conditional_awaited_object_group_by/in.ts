import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function groupSource(flag: number): Promise<number[]> {
    trace += "L";
    if (flag === 9) return Promise.reject("object-group-bad");
    return delay(1, flag === 2 ? [] : [1, 2]);
}

function groupKey(value: number, _index: number): string {
    trace += "K";
    return value > 1 ? "high" : "low";
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

async function declaration(flag: number): Promise<string> {
    try {
        return (Object.groupBy(await groupSource(flag), groupKey) as any)
            ? await truthyArm("declaration-true")
            : "declaration-false";
    } catch (_reason) {
        return "caught-declaration";
    }
}

class ObjectGroupRunner {
    async method(flag: number): Promise<string> {
        try {
            return (Object.groupBy(await groupSource(flag), groupKey) as any)
                ? await truthyArm("method-true")
                : "method-false";
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return (Object.groupBy(await groupSource(flag), groupKey) as any)
            ? await truthyArm("arrow-true")
            : "arrow-false";
    } catch (_reason) {
        return "caught-arrow";
    } finally {
        trace += "V";
    }
};

const runner = new ObjectGroupRunner();

declaration(1)
    .then((value) => {
        console.log("declaration-true", value, trace);
        trace = "";
        return declaration(2);
    })
    .then((value) => {
        console.log("declaration-empty", value, trace);
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
