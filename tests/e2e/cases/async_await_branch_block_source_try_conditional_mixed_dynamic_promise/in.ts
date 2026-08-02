import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function dynamicArm(flag: boolean): Promise<unknown> {
    try {
        return flag ? { kind: "sync-object", value: "ok" } : await delayedRejectAfter(1, "await-bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

async function promiseArm(flag: boolean): Promise<string> {
    try {
        return flag ? delayedRejectAfter(2, "promise-bad") : await delay(3, "await-ok");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class MixedDynamicPromiseRunner {
    async method(flag: boolean): Promise<string> {
        try {
            return flag ? delayedRejectAfter(4, "method-promise-bad") : await delay(5, "method-await-ok");
        } finally {
            trace += flag ? "P" : "A";
        }
    }
}

const mixedDynamicPromiseCatchFinally = async (flag: boolean): Promise<unknown> => {
    try {
        return flag ? { kind: "arrow-sync-object", value: "ok" } : await delayedRejectAfter(6, "arrow-await-bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new MixedDynamicPromiseRunner();

dynamicArm(true)
    .then((value) => {
        console.log("dynamic-sync", JSON.stringify(value), trace);
        return dynamicArm(false);
    })
    .then((value) => {
        console.log("dynamic-await", value, trace);
        return promiseArm(true).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("promise-sync", value, trace);
        return promiseArm(false);
    })
    .then((value) => {
        console.log("promise-await", value, trace);
        return runner.method(true).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-promise", value, trace);
        return mixedDynamicPromiseCatchFinally(false);
    })
    .then((value) => {
        console.log("arrow-await", value, trace);
        return mixedDynamicPromiseCatchFinally(true);
    })
    .then((value) => console.log("arrow-sync", JSON.stringify(value), trace));
