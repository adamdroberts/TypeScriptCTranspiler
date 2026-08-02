import { setTimeout as delay } from "node:timers/promises";

type MaybeBoolean = boolean | undefined;

let trace = "";

function readReady(flag: number): MaybeBoolean {
    trace += "R";
    if (flag === 5) throw "ready-bad";
    if (flag === 1) return true;
    if (flag === 2) return false;
    return undefined;
}

function select(flag: number): Promise<boolean> {
    trace += "A";
    if (flag === 6) return Promise.reject("selector-bad");
    return delay(1, flag === 3);
}

async function nonstableNullishCatch(flag: number): Promise<string> {
    try {
        return (readReady(flag) ?? await select(flag))
            ? await delay(2, "fn-true")
            : await delay(3, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NonstableNullishRunner {
    async method(flag: number): Promise<string> {
        try {
            return (readReady(flag) ?? await select(flag))
                ? await delay(4, "method-true")
                : await delay(5, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const nonstableNullishCatchFinally = async (flag: number): Promise<string> => {
    try {
        return (readReady(flag) ?? await select(flag))
            ? await delay(6, "arrow-true")
            : await delay(7, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new NonstableNullishRunner();

nonstableNullishCatch(1)
    .then((value) => {
        console.log("fn-ready-true", value, trace);
        trace = "";
        return nonstableNullishCatch(2);
    })
    .then((value) => {
        console.log("fn-ready-false", value, trace);
        trace = "";
        return nonstableNullishCatch(3);
    })
    .then((value) => {
        console.log("fn-await-true", value, trace);
        trace = "";
        return nonstableNullishCatch(4);
    })
    .then((value) => {
        console.log("fn-await-false", value, trace);
        trace = "";
        return nonstableNullishCatch(5);
    })
    .then((value) => {
        console.log("fn-ready-throw", value, trace);
        trace = "";
        return nonstableNullishCatch(6);
    })
    .then((value) => {
        console.log("fn-selector-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-ready-true", value, trace);
        trace = "";
        return runner.method(3);
    })
    .then((value) => {
        console.log("method-await-true", value, trace);
        trace = "";
        return runner.method(5).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-ready-throw", value, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-selector-reject", value, trace);
        trace = "";
        return nonstableNullishCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-ready-false", value, trace);
        trace = "";
        return nonstableNullishCatchFinally(3);
    })
    .then((value) => {
        console.log("arrow-await-true", value, trace);
        trace = "";
        return nonstableNullishCatchFinally(5);
    })
    .then((value) => {
        console.log("arrow-ready-throw", value, trace);
        trace = "";
        return nonstableNullishCatchFinally(6);
    })
    .then((value) => console.log("arrow-selector-reject", value, trace));
