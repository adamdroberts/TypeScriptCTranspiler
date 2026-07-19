import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "-";

async function branchSourceTryFallthrough(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        try {
            const value = await delay(1, "branch");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        }
    }
    try {
        const value = await delayedRejectAfter(2, "fall-bad");
        return prefix + value;
    } catch (reason) {
        return "caught-" + reason;
    }
}

class SourceTryFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            try {
                const value = await delay(3, "method-branch");
                return this.prefix + value;
            } finally {
                trace += "M";
            }
        }
        try {
            const value = await delayedRejectAfter(4, "method-fall-bad");
            return this.prefix + value;
        } finally {
            trace += "m";
        }
    }
}

const branchSourceTryCatchFinallyFallthroughValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        try {
            const value = await delay(5, "value-branch");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        } finally {
            trace += "V";
        }
    }
    try {
        const value = await delayedRejectAfter(6, "value-fall-bad");
        return prefix + value;
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "v";
    }
};

const runner = new SourceTryFallthroughRunner("this-");

branchSourceTryFallthrough(true, "fn-")
    .then((value) => console.log("branch-source-try-fallthrough-true:", value, trace));
branchSourceTryFallthrough(false, "fn-")
    .then((value) => console.log("branch-source-try-fallthrough-false:", value, trace));
runner.method(true)
    .then((value) => console.log("method-branch-source-try-fallthrough-true:", value, trace));
runner.method(false)
    .catch((reason) => console.log("method-branch-source-try-fallthrough-false:", reason, trace));
branchSourceTryCatchFinallyFallthroughValue(true, "arrow-")
    .then((value) => console.log("value-branch-source-try-fallthrough-true:", value, trace));
branchSourceTryCatchFinallyFallthroughValue(false, "arrow-")
    .then((value) => console.log("value-branch-source-try-fallthrough-false:", value, trace));
