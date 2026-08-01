import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function nestedSourceTryCatch(flag: boolean, inner: boolean, prefix: string): Promise<string> {
    try {
        return flag
            ? (inner ? await delay(1, prefix + "inner") : await delayedRejectAfter(2, prefix + "bad"))
            : await delay(3, prefix + "outer");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NestedSourceTryRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, inner: boolean): Promise<string> {
        try {
            return flag
                ? (inner ? await delay(4, this.prefix + "inner") : await delayedRejectAfter(5, this.prefix + "bad"))
                : await delay(6, this.prefix + "outer");
        } finally {
            trace += flag ? (inner ? "A" : "B") : "C";
        }
    }
}

const nestedSourceTryCatchFinally = async (flag: boolean, inner: boolean, prefix: string): Promise<string> => {
    try {
        return flag
            ? (inner ? await delay(7, prefix + "inner") : await delayedRejectAfter(8, prefix + "bad"))
            : await delay(9, prefix + "outer");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += inner ? "I" : "O";
    }
};

const runner = new NestedSourceTryRunner("method-");

nestedSourceTryCatch(true, true, "fn-")
    .then((value) => {
        console.log("fn-inner", value, trace);
        return nestedSourceTryCatch(true, false, "fn-");
    })
    .then((value) => {
        console.log("fn-caught", value, trace);
        return nestedSourceTryCatch(false, false, "fn-");
    })
    .then((value) => {
        console.log("fn-outer", value, trace);
        return runner.method(true, true);
    })
    .then((value) => {
        console.log("method-inner", value, trace);
        return runner.method(true, false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-caught", value, trace);
        return nestedSourceTryCatchFinally(true, false, "arrow-");
    })
    .then((value) => {
        console.log("arrow-caught", value, trace);
        return nestedSourceTryCatchFinally(false, true, "arrow-");
    })
    .then((value) => console.log("arrow-outer", value, trace));
