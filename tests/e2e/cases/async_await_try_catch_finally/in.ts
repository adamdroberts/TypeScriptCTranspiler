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

const liftedCombinedTryCatchFinallyPrelude = async (): Promise<string> => {
    try {
        const value = await delayedRejectAfter(11, "lifted-combined-prelude-bad");
        return "lifted-combined-prelude:" + value;
    } catch (e) {
        const label = "lifted-combined-prelude-caught:";
        if (String(e).length > 0) console.log("combined-catch-control: lifted");
        let suffix: string;
        suffix = ":done";
        return label + e + suffix;
    } finally {
        const marker = "Y";
        let suffix: string;
        suffix = "!";
        trace += marker + suffix;
    }
};

function makeNestedCombinedTryCatchFinally(prefix: string): (flag: boolean) => Promise<string> {
    return async (flag: boolean): Promise<string> => {
        try {
            const value = await (flag ? delay(5, "nested-ok") : delayedRejectAfter(6, "nested-bad"));
            return prefix + "nested:" + value;
        } catch (e) {
            return prefix + "nested-catch:" + e;
        } finally {
            trace += flag ? "N" : "n";
        }
    };
}

function makeNestedCombinedTryCatchFinallyPrelude(prefix: string): () => Promise<string> {
    return async (): Promise<string> => {
        try {
            const value = await delayedRejectAfter(12, "nested-combined-prelude-bad");
            return prefix + "nested-combined-prelude:" + value;
        } catch (e) {
            const label = prefix + "nested-combined-prelude-caught:";
            if (String(e).length > 0) console.log("combined-catch-control: nested");
            let suffix: string;
            suffix = ":done";
            return label + e + suffix;
        } finally {
            const marker = "y";
            let suffix: string;
            suffix = "!";
            trace += marker + suffix;
        }
    };
}

class CombinedTryWorker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async combinedTryCatchFinally(flag: boolean): Promise<string> {
        try {
            const value = await (flag ? delay(7, "method-ok") : delayedRejectAfter(8, "method-bad"));
            return this.prefix + "method:" + value;
        } catch (e) {
            return this.prefix + "method-catch:" + e;
        } finally {
            trace += flag ? "M" : "m";
        }
    }

    async combinedTryCatchFinallyPrelude(): Promise<string> {
        try {
            const value = await delayedRejectAfter(13, "method-combined-prelude-bad");
            return this.prefix + "method-combined-prelude:" + value;
        } catch (e) {
            const label = this.prefix + "method-combined-prelude-caught:";
            if (String(e).length > 0) console.log("combined-catch-control: method");
            let suffix: string;
            suffix = ":done";
            return label + e + suffix;
        } finally {
            const marker = "Z";
            let suffix: string;
            suffix = "!";
            trace += marker + suffix;
        }
    }
}

async function combinedTryCatchFinallyThrowFulfilled(): Promise<string> {
    try {
        const value = await delay(9, "throw-ok");
        return "never " + value;
    } catch (e) {
        return "catch-never:" + e;
    } finally {
        trace += "X";
        throw "combined-finally-throw-fulfilled:" + trace;
    }
}

async function combinedTryCatchFinallyThrowRejected(): Promise<string> {
    try {
        const value = await delayedRejectAfter(10, "throw-bad");
        return "never " + value;
    } catch (e) {
        return "catch-before-finally:" + e;
    } finally {
        trace += "x";
        throw "combined-finally-throw-rejected:" + trace;
    }
}

const nestedCombinedTryCatchFinally = makeNestedCombinedTryCatchFinally("closure-");
const nestedCombinedTryCatchFinallyPrelude = makeNestedCombinedTryCatchFinallyPrelude("closure-");
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

nestedCombinedTryCatchFinally(true).then((value: string): void => {
    console.log("nested-combined-try-catch-finally-fulfilled:", value, trace);
});

nestedCombinedTryCatchFinally(false).then((value: string): void => {
    console.log("nested-combined-try-catch-finally-rejected:", value, trace);
});

worker.combinedTryCatchFinally(true).then((value: string): void => {
    console.log("method-combined-try-catch-finally-fulfilled:", value, trace);
});

worker.combinedTryCatchFinally(false).then((value: string): void => {
    console.log("method-combined-try-catch-finally-rejected:", value, trace);
});

combinedTryCatchFinallyThrowFulfilled().catch((reason: string): void => {
    console.log("combined-try-catch-finally-throw-fulfilled:", reason, trace);
});

combinedTryCatchFinallyThrowRejected().catch((reason: string): void => {
    console.log("combined-try-catch-finally-throw-rejected:", reason, trace);
});

liftedCombinedTryCatchFinallyPrelude().then((value: string): void => {
    console.log("lifted-combined-try-catch-finally-prelude:", value, trace);
});

nestedCombinedTryCatchFinallyPrelude().then((value: string): void => {
    console.log("nested-combined-try-catch-finally-prelude:", value, trace);
});

worker.combinedTryCatchFinallyPrelude().then((value: string): void => {
    console.log("method-combined-try-catch-finally-prelude:", value, trace);
});
