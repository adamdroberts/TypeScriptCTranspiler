import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function sourceTryConditionalCatch(flag: boolean, prefix: string): Promise<string> {
    try {
        return flag ? await delay(1, prefix + "true") : await delayedRejectAfter(2, prefix + "bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class SourceTryConditionalRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        try {
            return flag ? await delay(3, this.prefix + "true") : await delayedRejectAfter(4, this.prefix + "bad");
        } finally {
            trace += flag ? "M" : "m";
        }
    }
}

const sourceTryConditionalCatchFinally = async (flag: boolean, prefix: string): Promise<string> => {
    try {
        return flag ? await delay(5, prefix + "true") : await delayedRejectAfter(6, prefix + "bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new SourceTryConditionalRunner("method-");

sourceTryConditionalCatch(true, "fn-")
    .then((value) => {
        console.log("fn-true", value, trace);
        return sourceTryConditionalCatch(false, "fn-");
    })
    .then((value) => {
        console.log("fn-false", value, trace);
        return runner.method(true);
    })
    .then((value) => {
        console.log("method-true", value, trace);
        return runner.method(false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-false", value, trace);
        return sourceTryConditionalCatchFinally(true, "arrow-");
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        return sourceTryConditionalCatchFinally(false, "arrow-");
    })
    .then((value) => console.log("arrow-false", value, trace));
