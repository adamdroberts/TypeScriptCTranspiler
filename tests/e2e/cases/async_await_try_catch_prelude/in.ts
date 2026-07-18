import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let catchTrace = "";

async function catchPreludeReturn(flag: boolean): Promise<string> {
    try {
        const value = await (flag ? delay(1, "ok") : delayedRejectAfter(2, "bad"));
        return "try:" + value;
    } catch (e) {
        catchTrace = catchTrace + "R" + e;
        return "caught:" + e + ":" + catchTrace;
    }
}

async function catchPreludeThrow(): Promise<string> {
    try {
        const value = await delayedRejectAfter(3, "throw-bad");
        return "try:" + value;
    } catch (e) {
        catchTrace = catchTrace + "T" + e;
        throw e + ":" + catchTrace;
    }
}

catchPreludeReturn(true).then((value: string): void => {
    console.log("catch-prelude-return-fulfilled:", value, catchTrace);
});

catchPreludeReturn(false).then((value: string): void => {
    console.log("catch-prelude-return-rejected:", value, catchTrace);
});

catchPreludeThrow().catch((reason: string): void => {
    console.log("catch-prelude-throw:", reason, catchTrace);
});
