import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function combinedTryCatchFinally(flag: boolean): Promise<string> {
    try {
        const value = await (flag ? delay(1, "ok") : delayedRejectAfter(2, "bad"));
        return "try:" + value;
    } catch (e) {
        return "catch:" + e;
    } finally {
        trace += "F";
    }
}

const liftedCombinedTryCatchFinally = async (flag: boolean): Promise<string> => {
    try {
        const value = await (flag ? delay(3, "lifted-ok") : delayedRejectAfter(4, "lifted-bad"));
        return "lifted:" + value;
    } catch (e) {
        return "lifted-catch:" + e;
    } finally {
        trace += flag ? "L" : "l";
    }
};

class CombinedTryWorker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async combinedTryCatchFinally(flag: boolean): Promise<string> {
        try {
            const value = await (flag ? delay(5, "method-ok") : delayedRejectAfter(6, "method-bad"));
            return this.prefix + "method:" + value;
        } catch (e) {
            return this.prefix + "method-catch:" + e;
        } finally {
            trace += flag ? "M" : "m";
        }
    }
}

const worker = new CombinedTryWorker("class-");

combinedTryCatchFinally(true).then((value: string): void => {
    console.log("combined-try-catch-finally-fulfilled:", value, trace);
});

combinedTryCatchFinally(false).then((value: string): void => {
    console.log("combined-try-catch-finally-rejected:", value, trace);
});

liftedCombinedTryCatchFinally(true).then((value: string): void => {
    console.log("lifted-combined-try-catch-finally-fulfilled:", value, trace);
});

liftedCombinedTryCatchFinally(false).then((value: string): void => {
    console.log("lifted-combined-try-catch-finally-rejected:", value, trace);
});

worker.combinedTryCatchFinally(true).then((value: string): void => {
    console.log("method-combined-try-catch-finally-fulfilled:", value, trace);
});

worker.combinedTryCatchFinally(false).then((value: string): void => {
    console.log("method-combined-try-catch-finally-rejected:", value, trace);
});
