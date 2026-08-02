import { setTimeout as delay } from "node:timers/promises";

function select(flag: number): Promise<boolean> {
    if (flag === 2) return Promise.reject("selector-bad");
    return delay(flag === 1 ? 1 : 2, flag === 1);
}

let trace = "";

async function awaitedRhsCatch(flag: number, ready: boolean): Promise<string> {
    try {
        return (ready && await select(flag)) ? await delay(3, "fn-true") : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class AwaitedRhsRunner {
    async method(flag: number, ready: boolean): Promise<string> {
        try {
            return (ready || await select(flag)) ? await delay(5, "method-true") : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const awaitedRhsCatchFinally = async (flag: number, ready: boolean): Promise<string> => {
    try {
        return (ready && await select(flag)) ? await delay(7, "arrow-true") : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new AwaitedRhsRunner();

awaitedRhsCatch(2, false)
    .then((value) => {
        console.log("fn-short", value, trace);
        return awaitedRhsCatch(1, true);
    })
    .then((value) => {
        console.log("fn-true", value, trace);
        return awaitedRhsCatch(2, true);
    })
    .then((value) => {
        console.log("fn-reject", value, trace);
        return awaitedRhsCatch(0, true);
    })
    .then((value) => {
        console.log("fn-false", value, trace);
        return runner.method(2, true);
    })
    .then((value) => {
        console.log("method-short", value, trace);
        return runner.method(0, false);
    })
    .then((value) => {
        console.log("method-false", value, trace);
        return runner.method(1, false);
    })
    .then((value) => {
        console.log("method-true", value, trace);
        return runner.method(2, false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return awaitedRhsCatchFinally(2, false);
    })
    .then((value) => {
        console.log("arrow-short", value, trace);
        return awaitedRhsCatchFinally(1, true);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        return awaitedRhsCatchFinally(0, true);
    })
    .then((value) => {
        console.log("arrow-false", value, trace);
        return awaitedRhsCatchFinally(2, true);
    })
    .then((value) => console.log("arrow-reject", value, trace));
