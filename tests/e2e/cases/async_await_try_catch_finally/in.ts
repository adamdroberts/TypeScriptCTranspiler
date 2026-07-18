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

combinedTryCatchFinally(true).then((value: string): void => {
    console.log("combined-try-catch-finally-fulfilled:", value, trace);
});

combinedTryCatchFinally(false).then((value: string): void => {
    console.log("combined-try-catch-finally-rejected:", value, trace);
});
