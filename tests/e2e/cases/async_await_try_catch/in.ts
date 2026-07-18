import { setTimeout as delay } from "node:timers/promises";

function delayedReject(reason: string): Promise<string> {
    return delay(4, reason).then((value: string): string => {
        throw value;
    });
}

let finallyTrace = "";

async function recover(): Promise<string> {
    try {
        await Promise.reject("bad");
        return "never";
    } catch (e) {
        return "caught " + e;
    }
}

async function rethrow(): Promise<string> {
    try {
        await Promise.reject("again");
        return "never";
    } catch (e) {
        throw e + "!";
    }
}

async function finallyAfterCatch(): Promise<string> {
    let seen = "";
    try {
        await Promise.reject("inside");
        seen = "never";
    } catch (e) {
        seen = "catch " + e;
    } finally {
        seen += " finally";
    }
    return seen;
}

async function pendingTryFulfilled(): Promise<string> {
    try {
        const value = await delay(2, "ok");
        return "pending " + value;
    } catch (e) {
        return "pending caught " + e;
    }
}

async function pendingTryRejected(): Promise<string> {
    try {
        const value = await delayedReject("bad");
        return "never " + value;
    } catch (e) {
        return "pending caught " + e;
    }
}

async function pendingTryCatchFallthroughFulfilled(): Promise<string> {
    try {
        const value = await delay(3, "ok");
    } catch (e) {
        return "fallthrough caught " + e;
    }
    return "fallthrough done";
}

async function pendingTryCatchFallthroughRejected(): Promise<string> {
    try {
        const value = await delayedReject("fall bad");
    } catch (e) {
        return "fallthrough caught " + e;
    }
    return "fallthrough never";
}

async function pendingBareTryFulfilled(): Promise<string> {
    try {
        await delay(5, "ok");
        return "bare pending done";
    } catch (e) {
        return "bare pending caught " + e;
    }
}

async function pendingBareTryRejected(): Promise<string> {
    try {
        await delayedReject("bare bad");
        return "bare never";
    } catch (e) {
        return "bare pending caught " + e;
    }
}

async function pendingBareTryCatchFallthroughFulfilled(): Promise<string> {
    try {
        await delay(5, "ok");
    } catch (e) {
        return "bare fallthrough caught " + e;
    }
    return "bare fallthrough done";
}

async function pendingBareTryCatchFallthroughRejected(): Promise<string> {
    try {
        await delayedReject("bare fall bad");
    } catch (e) {
        return "bare fallthrough caught " + e;
    }
    return "bare fallthrough never";
}

async function pendingTryFinallyFulfilled(): Promise<string> {
    try {
        const value = await delay(6, "ok");
        return "pending finally " + value;
    } finally {
        finallyTrace += "F";
    }
}

async function pendingTryFinallyRejected(): Promise<string> {
    try {
        const value = await delayedReject("final bad");
        return "never " + value;
    } finally {
        finallyTrace += "R";
    }
}

async function pendingTryFinallyFallthroughFulfilled(): Promise<string> {
    try {
        const value = await delay(7, "ok");
    } finally {
        finallyTrace += "f";
    }
    return "finally fallthrough done " + finallyTrace;
}

async function pendingTryFinallyFallthroughRejected(): Promise<string> {
    try {
        const value = await delayedReject("fall final bad");
    } finally {
        finallyTrace += "r";
    }
    return "finally fallthrough never";
}

recover().then((value: string): void => {
    console.log("recover:", value);
});

rethrow().catch((reason: string): string => {
    console.log("rethrow:", reason);
    return "done";
}).then((value: string): void => {
    console.log("after:", value);
});

finallyAfterCatch().then((value: string): void => {
    console.log("finally:", value);
});

pendingTryFulfilled().then((value: string): void => {
    console.log("pending-fulfilled:", value);
});

pendingTryRejected().then((value: string): void => {
    console.log("pending-rejected:", value);
});

pendingTryCatchFallthroughFulfilled().then((value: string): void => {
    console.log("pending-fallthrough-fulfilled:", value);
});

pendingTryCatchFallthroughRejected().then((value: string): void => {
    console.log("pending-fallthrough-rejected:", value);
});

pendingBareTryFulfilled().then((value: string): void => {
    console.log("pending-bare-fulfilled:", value);
});

pendingBareTryRejected().then((value: string): void => {
    console.log("pending-bare-rejected:", value);
});

pendingBareTryCatchFallthroughFulfilled().then((value: string): void => {
    console.log("pending-bare-fallthrough-fulfilled:", value);
});

pendingBareTryCatchFallthroughRejected().then((value: string): void => {
    console.log("pending-bare-fallthrough-rejected:", value);
});

pendingTryFinallyFulfilled().then((value: string): void => {
    console.log("pending-finally-fulfilled:", value, finallyTrace);
});

pendingTryFinallyRejected().catch((reason: string): void => {
    console.log("pending-finally-rejected:", reason, finallyTrace);
});

pendingTryFinallyFallthroughFulfilled().then((value: string): void => {
    console.log("pending-finally-fallthrough-fulfilled:", value);
});

pendingTryFinallyFallthroughRejected().catch((reason: string): void => {
    console.log("pending-finally-fallthrough-rejected:", reason, finallyTrace);
});
