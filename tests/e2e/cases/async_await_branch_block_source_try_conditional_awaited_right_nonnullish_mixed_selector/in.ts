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
    return delay(1, flag !== 3);
}

function maybe(flag: number): MaybeBoolean {
    trace += "M";
    if (flag === 2 || flag === 7) return undefined;
    return flag !== 4;
}

function fallback(flag: number): Promise<boolean> {
    trace += "F";
    if (flag === 7) return Promise.reject("fallback-bad");
    return delay(2, flag === 2);
}

async function comparisonCatch(flag: number): Promise<string> {
    try {
        return ((ready(flag) === await left(flag)) && maybe(flag)) ?? await fallback(flag)
            ? await delay(3, "fn-true")
            : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class RightAwaitRunner {
    async method(flag: number): Promise<string> {
        try {
            return ((ready(flag) !== await left(flag)) || maybe(flag)) ?? await fallback(flag)
                ? await delay(5, "method-true")
                : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const rightAwaitCatchFinally = async (flag: number): Promise<string> => {
    try {
        return ((ready(flag) === await left(flag)) && maybe(flag)) ?? await fallback(flag)
            ? await delay(7, "arrow-true")
            : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new RightAwaitRunner();

comparisonCatch(1)
    .then((value) => {
        console.log("fn-match-true", value, trace);
        trace = "";
        return comparisonCatch(2);
    })
    .then((value) => {
        console.log("fn-fallback-true", value, trace);
        trace = "";
        return comparisonCatch(3);
    })
    .then((value) => {
        console.log("fn-left-false", value, trace);
        trace = "";
        return comparisonCatch(4);
    })
    .then((value) => {
        console.log("fn-maybe-false", value, trace);
        trace = "";
        return comparisonCatch(6);
    })
    .then((value) => {
        console.log("fn-left-reject", value, trace);
        trace = "";
        return comparisonCatch(7);
    })
    .then((value) => {
        console.log("fn-fallback-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-match-false", value, trace);
        trace = "";
        return runner.method(2);
    })
    .then((value) => {
        console.log("method-fallback-true", value, trace);
        trace = "";
        return runner.method(4);
    })
    .then((value) => {
        console.log("method-maybe-false", value, trace);
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
        return rightAwaitCatchFinally(1);
    })
    .then((value) => {
        console.log("arrow-match-true", value, trace);
        trace = "";
        return rightAwaitCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-fallback-true", value, trace);
        trace = "";
        return rightAwaitCatchFinally(4);
    })
    .then((value) => {
        console.log("arrow-maybe-false", value, trace);
        trace = "";
        return rightAwaitCatchFinally(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return rightAwaitCatchFinally(7);
    })
    .then((value) => console.log("arrow-fallback-reject", value, trace));
