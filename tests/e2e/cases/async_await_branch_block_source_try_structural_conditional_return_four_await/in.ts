import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function declaration(flag: boolean, inner: boolean): Promise<unknown> {
    try {
        return flag
            ? (inner
                ? { first: await delay(1, "fn-inner-left"), second: await delay(1, "fn-inner-right") }
                : { first: await delay(1, "fn-caught-first"), second: await delayedRejectAfter(2, "fn-bad") })
            : { first: await delay(1, "fn-outer-first"), second: await delay(1, "fn-outer-second") };
    } catch (reason) {
        return "caught-" + reason;
    }
}

class Runner {
    async method(flag: boolean, inner: boolean): Promise<unknown> {
        try {
            return flag
                ? (inner
                    ? { first: await delay(1, "method-inner-first"), second: await delay(1, "method-inner-second") }
                    : [await delay(1, "method-caught-first"), await delayedRejectAfter(2, "method-bad")])
                : [await delay(1, "method-outer-first"), await delay(1, "method-outer-second")];
        } finally {
            trace += flag ? (inner ? "I" : "C") : "O";
        }
    }
}

const arrow = async (flag: boolean, inner: boolean): Promise<unknown> => {
    try {
        return flag
            ? (inner
                ? [await delay(1, "arrow-inner-left"), await delay(1, "arrow-inner-right")]
                : { first: await delay(1, "arrow-caught-first"), second: await delayedRejectAfter(2, "arrow-bad") })
            : { first: await delay(1, "arrow-outer-first"), second: await delay(1, "arrow-outer-second") };
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += inner ? "i" : "o";
    }
};

const runner = new Runner();

declaration(true, true)
    .then((value) => {
        console.log("fn-inner", JSON.stringify(value), trace);
        return declaration(true, false);
    })
    .then((value) => {
        console.log("fn-caught", value, trace);
        return declaration(false, false);
    })
    .then((value) => {
        console.log("fn-outer", JSON.stringify(value), trace);
        return runner.method(true, true);
    })
    .then((value) => {
        console.log("method-inner", JSON.stringify(value), trace);
        return runner.method(true, false).then(
            (result) => "unexpected-" + JSON.stringify(result),
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-caught", value, trace);
        return arrow(true, false);
    })
    .then((value) => {
        console.log("arrow-caught", value, trace);
        return arrow(false, true);
    })
    .then((value) => console.log("arrow-outer", JSON.stringify(value), trace));
