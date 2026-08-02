import { setTimeout as delay } from "node:timers/promises";

type MaybeBoolean = boolean | undefined;

let trace = "";

function left(flag: number): Promise<boolean> {
    trace += "L";
    if (flag === 6) return Promise.reject("left-bad");
    return delay(1, flag !== 1);
}

function ready(flag: number): MaybeBoolean {
    trace += "R";
    if (flag === 2 || flag === 7) return undefined;
    return flag !== 3;
}

function right(flag: number): Promise<boolean> {
    trace += "T";
    if (flag === 7) return Promise.reject("right-bad");
    return delay(2, flag === 2);
}

async function comparisonCatch(flag: number): Promise<string> {
    try {
        return ((await left(flag) === true && ready(flag)) ?? await right(flag))
            ? await delay(3, "fn-true")
            : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NonNullishSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return ((!(await left(flag))) || ready(flag)) ?? await right(flag)
                ? await delay(5, "method-true")
                : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const nonNullishSelectorCatchFinally = async (flag: number): Promise<string> => {
    try {
        return ((!(await left(flag))) || ready(flag)) ?? await right(flag)
            ? await delay(7, "arrow-true")
            : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new NonNullishSelectorRunner();

comparisonCatch(1)
    .then((value) => {
        console.log("fn-left-false", value, trace);
        trace = "";
        return comparisonCatch(2);
    })
    .then((value) => {
        console.log("fn-right-true", value, trace);
        trace = "";
        return comparisonCatch(3);
    })
    .then((value) => {
        console.log("fn-ready-false", value, trace);
        trace = "";
        return comparisonCatch(4);
    })
    .then((value) => {
        console.log("fn-ready-true", value, trace);
        trace = "";
        return comparisonCatch(6);
    })
    .then((value) => {
        console.log("fn-left-reject", value, trace);
        trace = "";
        return comparisonCatch(7);
    })
    .then((value) => {
        console.log("fn-right-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-left-false", value, trace);
        trace = "";
        return runner.method(2);
    })
    .then((value) => {
        console.log("method-right-true", value, trace);
        trace = "";
        return runner.method(3);
    })
    .then((value) => {
        console.log("method-ready-false", value, trace);
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
        console.log("method-right-reject", value, trace);
        trace = "";
        return nonNullishSelectorCatchFinally(1);
    })
    .then((value) => {
        console.log("arrow-left-false", value, trace);
        trace = "";
        return nonNullishSelectorCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-right-true", value, trace);
        trace = "";
        return nonNullishSelectorCatchFinally(3);
    })
    .then((value) => {
        console.log("arrow-ready-false", value, trace);
        trace = "";
        return nonNullishSelectorCatchFinally(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return nonNullishSelectorCatchFinally(7);
    })
    .then((value) => console.log("arrow-right-reject", value, trace));
