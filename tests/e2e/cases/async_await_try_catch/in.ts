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

pendingTryFinallyFulfilled().then((value: string): void => {
    console.log("pending-finally-fulfilled:", value, finallyTrace);
});

pendingTryFinallyRejected().catch((reason: string): void => {
    console.log("pending-finally-rejected:", reason, finallyTrace);
});
