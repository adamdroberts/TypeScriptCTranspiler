import { setTimeout as delay } from "node:timers/promises";

type MaybeReady = boolean | undefined;

function select(flag: number): Promise<boolean> {
    if (flag === 2) return Promise.reject("selector-bad");
    return delay(flag === 1 ? 1 : 2, flag === 1);
}

let trace = "";

async function nullishRhsCatch(flag: number, ready: MaybeReady): Promise<string> {
    try {
        return (ready ?? await select(flag)) ? await delay(3, "fn-true") : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NullishRhsRunner {
    async method(flag: number, ready: MaybeReady): Promise<string> {
        try {
            return (ready ?? await select(flag)) ? await delay(5, "method-true") : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const nullishRhsCatchFinally = async (flag: number, ready: MaybeReady): Promise<string> => {
    try {
        return (ready ?? await select(flag)) ? await delay(7, "arrow-true") : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new NullishRhsRunner();

nullishRhsCatch(2, false)
    .then((value) => {
        console.log("fn-false-short", value, trace);
        return nullishRhsCatch(2, true);
    })
    .then((value) => {
        console.log("fn-true-short", value, trace);
        return nullishRhsCatch(1, undefined);
    })
    .then((value) => {
        console.log("fn-true-await", value, trace);
        return nullishRhsCatch(0, undefined);
    })
    .then((value) => {
        console.log("fn-false-await", value, trace);
        return nullishRhsCatch(2, undefined);
    })
    .then((value) => {
        console.log("fn-reject", value, trace);
        return runner.method(2, false);
    })
    .then((value) => {
        console.log("method-false-short", value, trace);
        return runner.method(2, true);
    })
    .then((value) => {
        console.log("method-true-short", value, trace);
        return runner.method(1, undefined);
    })
    .then((value) => {
        console.log("method-true-await", value, trace);
        return runner.method(2, undefined).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return nullishRhsCatchFinally(2, false);
    })
    .then((value) => {
        console.log("arrow-false-short", value, trace);
        return nullishRhsCatchFinally(2, true);
    })
    .then((value) => {
        console.log("arrow-true-short", value, trace);
        return nullishRhsCatchFinally(1, undefined);
    })
    .then((value) => {
        console.log("arrow-true-await", value, trace);
        return nullishRhsCatchFinally(2, undefined);
    })
    .then((value) => console.log("arrow-reject", value, trace));
