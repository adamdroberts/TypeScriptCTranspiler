import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function pendingCatchThrowFulfilled(): Promise<string> {
    try {
        const value = await delay(1, "ok");
        return "fulfilled:" + value;
    } catch (e) {
        throw "rethrown:" + e;
    }
}

async function pendingCatchThrowRejected(): Promise<string> {
    try {
        const value = await delayedRejectAfter(2, "bad");
        return "never:" + value;
    } catch (e) {
        throw "rethrown:" + e;
    }
}

const arrowCatchThrow = async (flag: boolean): Promise<string> => {
    try {
        const value = await (flag ? delay(3, "arrow-ok") : delayedRejectAfter(4, "arrow-bad"));
        return "arrow:" + value;
    } catch (e) {
        throw "arrow-rethrown:" + e;
    }
};

function makeClosureCatchThrow(): (flag: boolean) => Promise<string> {
    return async (flag: boolean): Promise<string> => {
        try {
            const value = await (flag ? delay(5, "closure-ok") : delayedRejectAfter(6, "closure-bad"));
            return "closure:" + value;
        } catch (e) {
            throw "closure-rethrown:" + e;
        }
    };
}

const closureCatchThrow = makeClosureCatchThrow();

pendingCatchThrowFulfilled().then((value: string): void => {
    console.log("pending-catch-throw-fulfilled:", value);
});

pendingCatchThrowRejected().catch((reason: string): void => {
    console.log("pending-catch-throw-rejected:", reason);
});

arrowCatchThrow(true).then((value: string): void => {
    console.log("arrow-catch-throw-fulfilled:", value);
});

arrowCatchThrow(false).catch((reason: string): void => {
    console.log("arrow-catch-throw-rejected:", reason);
});

closureCatchThrow(true).then((value: string): void => {
    console.log("closure-catch-throw-fulfilled:", value);
});

closureCatchThrow(false).catch((reason: string): void => {
    console.log("closure-catch-throw-rejected:", reason);
});
