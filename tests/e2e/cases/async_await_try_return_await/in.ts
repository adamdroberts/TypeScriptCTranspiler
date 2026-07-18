import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function tryCatchReturnAwaitFulfilled(): Promise<string> {
    try {
        return await delay(1, "tc-ok");
    } catch (e) {
        return "tc-caught:" + e;
    }
}

async function tryCatchReturnAwaitRejected(): Promise<string> {
    try {
        return await delayedRejectAfter(2, "tc-bad");
    } catch (e) {
        return "tc-caught:" + e;
    }
}

async function tryFinallyReturnAwaitFulfilled(): Promise<string> {
    try {
        return await delay(3, "tf-ok");
    } finally {
        trace += "F";
    }
}

async function tryFinallyReturnAwaitRejected(): Promise<string> {
    try {
        return await delayedRejectAfter(4, "tf-bad");
    } finally {
        trace += "R";
    }
}

async function parenthesizedTryCatchReturnAwaitFulfilled(): Promise<string> {
    try {
        return (await delay(9, "tc-paren-ok"));
    } catch (e) {
        return "tc-paren-caught:" + e;
    }
}

async function parenthesizedTryCatchReturnAwaitRejected(): Promise<string> {
    try {
        return (await delayedRejectAfter(10, "tc-paren-bad"));
    } catch (e) {
        return "tc-paren-caught:" + e;
    }
}

async function parenthesizedTryFinallyReturnAwaitFulfilled(): Promise<string> {
    try {
        return (await delay(11, "tf-paren-ok"));
    } finally {
        trace += "P";
    }
}

async function parenthesizedTryFinallyReturnAwaitRejected(): Promise<string> {
    try {
        return (await delayedRejectAfter(12, "tf-paren-bad"));
    } finally {
        trace += "p";
    }
}

const arrowTryCatchReturnAwait = async (flag: boolean): Promise<string> => {
    try {
        return await (flag ? delay(5, "arrow-ok") : delayedRejectAfter(6, "arrow-bad"));
    } catch (e) {
        return "arrow-caught:" + e;
    }
};

function makeClosureTryFinally(): (flag: boolean) => Promise<string> {
    return async (flag: boolean): Promise<string> => {
        try {
            return await (flag ? delay(7, "closure-ok") : delayedRejectAfter(8, "closure-bad"));
        } finally {
            trace += flag ? "f" : "r";
        }
    };
}

const closureTryFinally = makeClosureTryFinally();

tryCatchReturnAwaitFulfilled().then((value: string): void => {
    console.log("try-catch-return-await-fulfilled:", value);
});

tryCatchReturnAwaitRejected().then((value: string): void => {
    console.log("try-catch-return-await-rejected:", value);
});

tryFinallyReturnAwaitFulfilled().then((value: string): void => {
    console.log("try-finally-return-await-fulfilled:", value, trace);
});

tryFinallyReturnAwaitRejected().catch((reason: string): void => {
    console.log("try-finally-return-await-rejected:", reason, trace);
});

parenthesizedTryCatchReturnAwaitFulfilled().then((value: string): void => {
    console.log("parenthesized-try-catch-return-await-fulfilled:", value);
});

parenthesizedTryCatchReturnAwaitRejected().then((value: string): void => {
    console.log("parenthesized-try-catch-return-await-rejected:", value);
});

parenthesizedTryFinallyReturnAwaitFulfilled().then((value: string): void => {
    console.log("parenthesized-try-finally-return-await-fulfilled:", value, trace);
});

parenthesizedTryFinallyReturnAwaitRejected().catch((reason: string): void => {
    console.log("parenthesized-try-finally-return-await-rejected:", reason, trace);
});

arrowTryCatchReturnAwait(true).then((value: string): void => {
    console.log("arrow-try-catch-return-await-fulfilled:", value);
});

arrowTryCatchReturnAwait(false).then((value: string): void => {
    console.log("arrow-try-catch-return-await-rejected:", value);
});

closureTryFinally(true).then((value: string): void => {
    console.log("closure-try-finally-return-await-fulfilled:", value, trace);
});

closureTryFinally(false).catch((reason: string): void => {
    console.log("closure-try-finally-return-await-rejected:", reason, trace);
});
