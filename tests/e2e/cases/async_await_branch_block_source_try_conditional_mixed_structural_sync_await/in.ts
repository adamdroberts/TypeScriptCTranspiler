import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function mixedStructuralCatch(flag: boolean, prefix: string): Promise<string[]> {
    try {
        return flag ? [prefix + "sync-left", prefix + "sync-right"] : [
            await delay(1, prefix + "await-left"),
            await delay(2, prefix + "await-right"),
        ];
    } catch (reason) {
        return ["caught-" + reason];
    }
}

class MixedStructuralRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string[]> {
        try {
            return flag ? [this.prefix + "sync-left", this.prefix + "sync-right"] : [
                await delay(3, this.prefix + "await-left"),
                await delayedRejectAfter(4, this.prefix + "await-bad"),
            ];
        } finally {
            trace += flag ? "M" : "m";
        }
    }
}

const mixedStructuralCatchFinally = async (flag: boolean, prefix: string): Promise<string[]> => {
    try {
        return flag ? [prefix + "sync-left", prefix + "sync-right"] : [
            await delay(5, prefix + "await-left"),
            await delayedRejectAfter(6, prefix + "await-bad"),
        ];
    } catch (reason) {
        return ["caught-" + reason];
    } finally {
        trace += "V";
    }
};

const runner = new MixedStructuralRunner("method-");

mixedStructuralCatch(true, "fn-")
    .then((value) => {
        console.log("fn-sync", value.join("|"), trace);
        return mixedStructuralCatch(false, "fn-");
    })
    .then((value) => {
        console.log("fn-await", value.join("|"), trace);
        return runner.method(true);
    })
    .then((value) => {
        console.log("method-sync", value.join("|"), trace);
        return runner.method(false).then(
            (result) => "unexpected-" + result.join("|"),
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-await", value, trace);
        return mixedStructuralCatchFinally(true, "arrow-");
    })
    .then((value) => {
        console.log("arrow-sync", value.join("|"), trace);
        return mixedStructuralCatchFinally(false, "arrow-");
    })
    .then((value) => console.log("arrow-await", value.join("|"), trace));
