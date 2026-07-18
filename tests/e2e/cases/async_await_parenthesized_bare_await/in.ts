import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let finallyTrace = "";

async function parenthesizedExpressionStatement(prefix: string): Promise<string> {
    (await delay(1, "ignored"));
    return prefix + "done";
}

async function parenthesizedTryCatchFulfilled(): Promise<string> {
    try {
        (await delay(2, "ok"));
        return "try-ok";
    } catch (e) {
        return "caught:" + e;
    }
}

async function parenthesizedTryCatchRejected(): Promise<string> {
    try {
        (await delayedRejectAfter(3, "bad"));
        return "never";
    } catch (e) {
        return "caught:" + e;
    }
}

async function parenthesizedTryFinallyFulfilled(): Promise<string> {
    try {
        (await delay(4, "ok"));
        return "finally-ok";
    } finally {
        finallyTrace += "F";
    }
}

async function parenthesizedTryFinallyRejected(): Promise<string> {
    try {
        (await delayedRejectAfter(5, "final-bad"));
        return "never";
    } finally {
        finallyTrace += "R";
    }
}

async function parenthesizedReturnAwait(): Promise<string> {
    return (await delay(6, "return-ok"));
}

parenthesizedExpressionStatement("parenthesized-").then((value: string): void => {
    console.log("parenthesized-expression-statement:", value);
});

parenthesizedTryCatchFulfilled().then((value: string): void => {
    console.log("parenthesized-try-catch-fulfilled:", value);
});

parenthesizedTryCatchRejected().then((value: string): void => {
    console.log("parenthesized-try-catch-rejected:", value);
});

parenthesizedTryFinallyFulfilled().then((value: string): void => {
    console.log("parenthesized-try-finally-fulfilled:", value, finallyTrace);
});

parenthesizedTryFinallyRejected().catch((reason: string): void => {
    console.log("parenthesized-try-finally-rejected:", reason, finallyTrace);
});

parenthesizedReturnAwait().then((value: string): void => {
    console.log("parenthesized-return-await:", value);
});
