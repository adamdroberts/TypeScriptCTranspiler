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

async function catchPreludeLocalReturn(): Promise<string> {
    try {
        const value = await delayedRejectAfter(4, "local-bad");
        return "try:" + value;
    } catch (e) {
        const label = "local:" + e;
        let decorated = label + ":" + catchTrace;
        decorated = decorated + ":done";
        return decorated;
    }
}

async function catchPreludeLocalThrow(): Promise<string> {
    try {
        const value = await delayedRejectAfter(5, "local-throw");
        return "try:" + value;
    } catch (e) {
        const label = "throw-local:" + e;
        throw label;
    }
}

async function catchPreludeUninitializedLocalReturn(): Promise<string> {
    try {
        const value = await delayedRejectAfter(6, "uninit-local");
        return "try:" + value;
    } catch (e) {
        let label: string;
        label = "uninit:" + e;
        let decorated: string;
        decorated = label + ":" + catchTrace;
        return decorated;
    }
}

async function catchPreludeUninitializedLocalThrow(): Promise<string> {
    try {
        const value = await delayedRejectAfter(7, "uninit-throw");
        return "try:" + value;
    } catch (e) {
        let label: string;
        label = "uninit-throw:" + e;
        throw label + ":" + catchTrace;
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

catchPreludeLocalReturn().then((value: string): void => {
    console.log("catch-prelude-local-return:", value);
});

catchPreludeLocalThrow().catch((reason: string): void => {
    console.log("catch-prelude-local-throw:", reason);
});

catchPreludeUninitializedLocalReturn().then((value: string): void => {
    console.log("catch-prelude-uninitialized-local-return:", value);
});

catchPreludeUninitializedLocalThrow().catch((reason: string): void => {
    console.log("catch-prelude-uninitialized-local-throw:", reason);
});
