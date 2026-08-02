import { setTimeout as delay } from "node:timers/promises";

type MaybeBoolean = boolean | undefined;

let trace = "";

function first(flag: number): Promise<MaybeBoolean> {
    trace += "1";
    if (flag === 5) return Promise.reject("first-bad");
    return delay(1, flag === 1 ? true : flag === 2 ? false : undefined);
}

function second(flag: number): Promise<boolean> {
    trace += "2";
    if (flag === 6) return Promise.reject("second-bad");
    return delay(2, flag === 4 || flag === 7);
}

function third(flag: number): Promise<boolean> {
    trace += "3";
    if (flag === 7) return Promise.reject("third-bad");
    return delay(3, flag === 4);
}

async function mixedNullishCatch(flag: number): Promise<string> {
    try {
        return (await first(flag) ?? (await second(flag) && await third(flag)))
            ? await delay(4, "fn-true")
            : await delay(5, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class MixedNullishRunner {
    async method(flag: number): Promise<string> {
        try {
            return (await first(flag) ?? (await second(flag) && await third(flag)))
                ? await delay(6, "method-true")
                : await delay(7, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const mixedNullishCatchFinally = async (flag: number): Promise<string> => {
    try {
        return (await first(flag) ?? (await second(flag) && await third(flag)))
            ? await delay(8, "arrow-true")
            : await delay(9, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new MixedNullishRunner();

mixedNullishCatch(1)
    .then((value) => {
        console.log("fn-first-true", value, trace);
        trace = "";
        return mixedNullishCatch(2);
    })
    .then((value) => {
        console.log("fn-first-false", value, trace);
        trace = "";
        return mixedNullishCatch(3);
    })
    .then((value) => {
        console.log("fn-second-false", value, trace);
        trace = "";
        return mixedNullishCatch(4);
    })
    .then((value) => {
        console.log("fn-third-true", value, trace);
        trace = "";
        return mixedNullishCatch(5);
    })
    .then((value) => {
        console.log("fn-first-reject", value, trace);
        trace = "";
        return mixedNullishCatch(6);
    })
    .then((value) => {
        console.log("fn-second-reject", value, trace);
        trace = "";
        return mixedNullishCatch(7);
    })
    .then((value) => {
        console.log("fn-third-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-first-true", value, trace);
        trace = "";
        return runner.method(3);
    })
    .then((value) => {
        console.log("method-second-false", value, trace);
        trace = "";
        return runner.method(4);
    })
    .then((value) => {
        console.log("method-third-true", value, trace);
        trace = "";
        return runner.method(5).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-first-reject", value, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-second-reject", value, trace);
        trace = "";
        return runner.method(7).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-third-reject", value, trace);
        trace = "";
        return mixedNullishCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-first-false", value, trace);
        trace = "";
        return mixedNullishCatchFinally(3);
    })
    .then((value) => {
        console.log("arrow-second-false", value, trace);
        trace = "";
        return mixedNullishCatchFinally(4);
    })
    .then((value) => {
        console.log("arrow-third-true", value, trace);
        trace = "";
        return mixedNullishCatchFinally(5);
    })
    .then((value) => {
        console.log("arrow-first-reject", value, trace);
        trace = "";
        return mixedNullishCatchFinally(6);
    })
    .then((value) => {
        console.log("arrow-second-reject", value, trace);
        trace = "";
        return mixedNullishCatchFinally(7);
    })
    .then((value) => console.log("arrow-third-reject", value, trace));
