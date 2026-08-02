import { setTimeout as delay } from "node:timers/promises";

type MaybeBoolean = boolean | undefined;

let trace = "";

function ready(flag: number): MaybeBoolean {
    trace += "R";
    if (flag === 5) return undefined;
    return flag !== 1;
}

function left(flag: number): Promise<MaybeBoolean> {
    trace += "L";
    if (flag === 6) return Promise.reject("left-bad");
    return delay(1, flag === 2 ? false : undefined);
}

function right(flag: number): Promise<boolean> {
    trace += "T";
    if (flag === 7) return Promise.reject("right-bad");
    return delay(2, flag === 3 || flag === 5);
}

async function compoundLeftCatch(flag: number): Promise<string> {
    try {
        return ((ready(flag) && await left(flag)) ?? await right(flag))
            ? await delay(3, "fn-true")
            : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class CompoundLeftRunner {
    async method(flag: number): Promise<string> {
        try {
            return ((ready(flag) && await left(flag)) ?? await right(flag))
                ? await delay(5, "method-true")
                : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const compoundLeftCatchFinally = async (flag: number): Promise<string> => {
    try {
        return ((ready(flag) && await left(flag)) ?? await right(flag))
            ? await delay(7, "arrow-true")
            : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new CompoundLeftRunner();

compoundLeftCatch(1)
    .then((value) => {
        console.log("fn-ready-false", value, trace);
        trace = "";
        return compoundLeftCatch(2);
    })
    .then((value) => {
        console.log("fn-left-false", value, trace);
        trace = "";
        return compoundLeftCatch(3);
    })
    .then((value) => {
        console.log("fn-right-true", value, trace);
        trace = "";
        return compoundLeftCatch(4);
    })
    .then((value) => {
        console.log("fn-right-false", value, trace);
        trace = "";
        return compoundLeftCatch(5);
    })
    .then((value) => {
        console.log("fn-short-nullish", value, trace);
        trace = "";
        return compoundLeftCatch(6);
    })
    .then((value) => {
        console.log("fn-left-reject", value, trace);
        trace = "";
        return compoundLeftCatch(7);
    })
    .then((value) => {
        console.log("fn-right-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-ready-false", value, trace);
        trace = "";
        return runner.method(3);
    })
    .then((value) => {
        console.log("method-right-true", value, trace);
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
        return compoundLeftCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-left-false", value, trace);
        trace = "";
        return compoundLeftCatchFinally(3);
    })
    .then((value) => {
        console.log("arrow-right-true", value, trace);
        trace = "";
        return compoundLeftCatchFinally(5);
    })
    .then((value) => {
        console.log("arrow-short-nullish", value, trace);
        trace = "";
        return compoundLeftCatchFinally(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return compoundLeftCatchFinally(7);
    })
    .then((value) => console.log("arrow-right-reject", value, trace));
