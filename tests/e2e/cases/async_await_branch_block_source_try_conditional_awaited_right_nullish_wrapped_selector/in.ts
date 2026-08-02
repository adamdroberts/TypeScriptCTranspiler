import { setTimeout as delay } from "node:timers/promises";

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

function fallback(flag: number): Promise<string> {
    trace += "F";
    if (flag === 7) return Promise.reject("fallback-bad");
    return delay(2, "fallback");
}

async function declaration(flag: number): Promise<string> {
    try {
        return Boolean(void (ready(flag) === await left(flag)))
            ? await delay(3, "declaration-true")
            : await fallback(flag);
    } catch (reason) {
        return "caught-" + reason;
    }
}

class WrappedRunner {
    async method(flag: number): Promise<string> {
        try {
            return Boolean(void (ready(flag) === await left(flag)))
                ? await delay(5, "method-true")
                : await fallback(flag);
        } finally {
            trace += "C";
        }
    }
}

const runner = new WrappedRunner();

const arrow = async (flag: number): Promise<string> => {
    try {
        return Boolean(void (ready(flag) === await left(flag)))
            ? await delay(7, "arrow-true")
            : await fallback(flag);
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

declaration(1)
    .then((value) => {
        console.log("declaration-fulfilled", value, trace);
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
        console.log("method-fulfilled", value, trace);
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
        console.log("arrow-fulfilled", value, trace);
        trace = "";
        return arrow(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return arrow(7);
    })
    .then((value) => console.log("arrow-fallback-reject", value, trace));
