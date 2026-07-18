import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let finallyTrace = "";

async function finallyPreludeLocalFulfilled(): Promise<string> {
    try {
        const value = await delay(1, "ok");
        return "try:" + value;
    } finally {
        const label = "F";
        let decorated = label + "!";
        finallyTrace = finallyTrace + decorated;
    }
}

async function finallyPreludeLocalRejected(): Promise<string> {
    try {
        const value = await delayedRejectAfter(2, "bad");
        return "try:" + value;
    } finally {
        const label = "R";
        finallyTrace = finallyTrace + label;
    }
}

async function finallyPreludeLocalFallthrough(): Promise<string> {
    try {
        await delay(3, "ignored");
    } finally {
        const label = "G";
        finallyTrace = finallyTrace + label;
    }
    return "fallthrough:" + finallyTrace;
}

finallyPreludeLocalFulfilled().then((value: string): void => {
    console.log("finally-prelude-local-fulfilled:", value, finallyTrace);
});

finallyPreludeLocalRejected().catch((reason: string): void => {
    console.log("finally-prelude-local-rejected:", reason, finallyTrace);
});

finallyPreludeLocalFallthrough().then((value: string): void => {
    console.log("finally-prelude-local-fallthrough:", value);
});
