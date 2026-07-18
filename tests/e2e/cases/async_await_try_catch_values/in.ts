import { setTimeout as delay } from "node:timers/promises";

function delayedReject(reason: string): Promise<string> {
    return delay(4, reason).then((value: string): string => {
        throw value;
    });
}

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

const liftedTryCatch = async (flag: boolean): Promise<string> => {
    try {
        const value = await (flag ? delay(1, "lifted-ok") : delayedReject("lifted-bad"));
        return "lifted:" + value;
    } catch (e) {
        return "lifted-caught:" + e;
    }
};

const liftedTryCatchPrelude = async (): Promise<string> => {
    try {
        const value = await delayedRejectAfter(7, "lifted-prelude-bad");
        return "lifted-prelude:" + value;
    } catch (e) {
        const label = "lifted-prelude-caught:";
        let suffix: string;
        suffix = ":done";
        return label + e + suffix;
    }
};

const liftedTryFinally = async (flag: boolean): Promise<string> => {
    try {
        const value = await (flag ? delay(2, "lifted-final-ok") : delayedReject("lifted-final-bad"));
        return "lifted-final:" + value;
    } finally {
        trace += flag ? "F" : "R";
    }
};

const liftedTryFinallyPrelude = async (): Promise<string> => {
    try {
        const value = await delay(9, "lifted-final-prelude-ok");
        return "lifted-final-prelude:" + value;
    } finally {
        const marker = "P";
        let suffix: string;
        suffix = "!";
        trace += marker + suffix;
    }
};

function makeNestedTryCatch(): (flag: boolean) => Promise<string> {
    return async function (flag: boolean): Promise<string> {
        try {
            const value = await (flag ? delay(3, "nested-ok") : delayedReject("nested-bad"));
            return "nested:" + value;
        } catch (e) {
            return "nested-caught:" + e;
        }
    };
}

function makeNestedTryCatchPrelude(): () => Promise<string> {
    return async function (): Promise<string> {
        try {
            const value = await delayedRejectAfter(8, "nested-prelude-bad");
            return "nested-prelude:" + value;
        } catch (e) {
            const label = "nested-prelude-caught:";
            let suffix: string;
            suffix = ":done";
            return label + e + suffix;
        }
    };
}

function makeNestedTryFinally(): (flag: boolean) => Promise<string> {
    return async (flag: boolean): Promise<string> => {
        try {
            const value = await (flag ? delay(5, "nested-final-ok") : delayedReject("nested-final-bad"));
            return "nested-final:" + value;
        } finally {
            trace += flag ? "f" : "r";
        }
    };
}

function makeNestedTryFinallyPrelude(): () => Promise<string> {
    return async (): Promise<string> => {
        try {
            const value = await delayedRejectAfter(10, "nested-final-prelude-bad");
            return "nested-final-prelude:" + value;
        } finally {
            const marker = "p";
            let suffix: string;
            suffix = "!";
            trace += marker + suffix;
        }
    };
}

const nestedTryCatch = makeNestedTryCatch();
const nestedTryCatchPrelude = makeNestedTryCatchPrelude();
const nestedTryFinally = makeNestedTryFinally();
const nestedTryFinallyPrelude = makeNestedTryFinallyPrelude();

liftedTryCatch(true).then((value: string): void => {
    console.log("lifted-try-catch-fulfilled:", value);
});

liftedTryCatch(false).then((value: string): void => {
    console.log("lifted-try-catch-rejected:", value);
});

liftedTryCatchPrelude().then((value: string): void => {
    console.log("lifted-try-catch-prelude:", value);
});

liftedTryFinally(true).then((value: string): void => {
    console.log("lifted-try-finally-fulfilled:", value, trace);
});

liftedTryFinally(false).catch((reason: string): void => {
    console.log("lifted-try-finally-rejected:", reason, trace);
});

liftedTryFinallyPrelude().then((value: string): void => {
    console.log("lifted-try-finally-prelude:", value, trace);
});

nestedTryCatch(true).then((value: string): void => {
    console.log("nested-try-catch-fulfilled:", value);
});

nestedTryCatch(false).then((value: string): void => {
    console.log("nested-try-catch-rejected:", value);
});

nestedTryCatchPrelude().then((value: string): void => {
    console.log("nested-try-catch-prelude:", value);
});

nestedTryFinally(true).then((value: string): void => {
    console.log("nested-try-finally-fulfilled:", value, trace);
});

nestedTryFinally(false).catch((reason: string): void => {
    console.log("nested-try-finally-rejected:", reason, trace);
});

nestedTryFinallyPrelude().catch((reason: string): void => {
    console.log("nested-try-finally-prelude:", reason, trace);
});
