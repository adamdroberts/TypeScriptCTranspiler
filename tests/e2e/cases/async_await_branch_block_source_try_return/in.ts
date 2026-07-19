import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function branchBlockSourceTryCatch(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        try {
            const value = await delay(1, "branch");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        }
    } else {
        try {
            const value = await delayedRejectAfter(2, "else-bad");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        }
    }
}

class SourceTryRunner {
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
        } else {
            try {
                const value = await delayedRejectAfter(4, "method-else-bad");
                return this.prefix + value;
            } finally {
                trace += "m";
            }
        }
    }
}

const branchBlockSourceTryCatchFinallyValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        try {
            const value = await delay(5, "value-branch");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        } finally {
            trace += "V";
        }
    } else {
        try {
            const value = await delayedRejectAfter(6, "value-else-bad");
            return prefix + value;
        } catch (reason) {
            return "caught-" + reason;
        } finally {
            trace += "v";
        }
    }
};

const runner = new SourceTryRunner("this-");

branchBlockSourceTryCatch(true, "fn-").then((value) => console.log("branch-block-source-try-catch-true:", value, trace));
branchBlockSourceTryCatch(false, "fn-").then((value) => console.log("branch-block-source-try-catch-false:", value, trace));
runner.method(true).then((value) => console.log("method-branch-block-source-try-finally-true:", value, trace));
runner.method(false).catch((reason) => console.log("method-branch-block-source-try-finally-false:", reason, trace));
branchBlockSourceTryCatchFinallyValue(true, "arrow-").then((value) => console.log("value-branch-block-source-try-catch-finally-true:", value, trace));
branchBlockSourceTryCatchFinallyValue(false, "arrow-").then((value) => console.log("value-branch-block-source-try-catch-finally-false:", value, trace));
