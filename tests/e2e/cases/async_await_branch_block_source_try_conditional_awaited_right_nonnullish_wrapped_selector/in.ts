import { setTimeout as delay } from "node:timers/promises";

type MaybeBoolean = boolean | undefined;

let trace = "";

function ready(flag: number): boolean {
    trace += "R";
    return true;
}

function left(flag: number): Promise<boolean> {
    trace += "L";
    if (flag === 6) return Promise.reject("left-bad");
    return delay(1, true);
}

function maybe(flag: number): MaybeBoolean {
    trace += "M";
    if (flag === 2 || flag === 7) return undefined;
    return flag !== 4;
}

function fallback(flag: number): Promise<boolean> {
    trace += "F";
    if (flag === 7) return Promise.reject("fallback-bad");
    return delay(2, true);
}

async function declaration(flag: number): Promise<string> {
    try {
        return ((!(ready(flag) === await left(flag)) || maybe(flag)) ?? await fallback(flag))
            ? await delay(3, "declaration-true")
            : await delay(4, "declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class WrappedRunner {
    async method(flag: number): Promise<string> {
        try {
            return ((typeof (ready(flag) === await left(flag)) && maybe(flag)) ?? await fallback(flag))
                ? await delay(5, "method-true")
                : await delay(6, "method-false");
        } finally {
            trace += "C";
        }
    }
}

const runner = new WrappedRunner();

const arrow = async (flag: number): Promise<string> => {
    try {
        return ((!(ready(flag) === await left(flag)) || maybe(flag)) ?? await fallback(flag))
            ? await delay(7, "arrow-true")
            : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

declaration(1)
    .then((value) => {
        console.log("declaration-match", value, trace);
        trace = "";
        return declaration(2);
    })
    .then((value) => {
        console.log("declaration-fallback", value, trace);
        trace = "";
        return declaration(4);
    })
    .then((value) => {
        console.log("declaration-false", value, trace);
        trace = "";
        return declaration(6);
    })
    .then((value) => {
        console.log("declaration-left-reject", value, trace);
        trace = "";
        return declaration(7);
    })
    .then((value) => {
        console.log("declaration-fallback-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-match", value, trace);
        trace = "";
        return runner.method(2);
    })
    .then((value) => {
        console.log("method-fallback", value, trace);
        trace = "";
        return runner.method(4);
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
        console.log("method-left-reject", value, trace);
        trace = "";
        return runner.method(7).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-fallback-reject", value, trace);
        trace = "";
        return arrow(1);
    })
    .then((value) => {
        console.log("arrow-match", value, trace);
        trace = "";
        return arrow(2);
    })
    .then((value) => {
        console.log("arrow-fallback", value, trace);
        trace = "";
        return arrow(4);
    })
    .then((value) => {
        console.log("arrow-false", value, trace);
        trace = "";
        return arrow(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return arrow(7);
    })
    .then((value) => console.log("arrow-fallback-reject", value, trace));
