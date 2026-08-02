import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

function throwSync(reason: string): string {
    throw reason;
}

let trace = "";

async function sourceTryConditionalMixedCatch(flag: boolean, prefix: string): Promise<string> {
    try {
        return flag ? prefix + "sync" : await delayedRejectAfter(1, prefix + "bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class SourceTryConditionalMixedRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        try {
            return flag ? this.prefix + "sync" : await delayedRejectAfter(2, this.prefix + "bad");
        } finally {
            trace += flag ? "M" : "m";
        }
    }
}

const sourceTryConditionalMixedCatchFinally = async (flag: boolean, prefix: string): Promise<string> => {
    try {
        return flag ? prefix + "sync" : await delayedRejectAfter(3, prefix + "bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function sourceTryConditionalMixedSyncThrow(prefix: string): Promise<string> {
    try {
        return true ? throwSync(prefix + "sync-bad") : await delay(4, prefix + "unused");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class SourceTryConditionalMixedThrowRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(): Promise<string> {
        try {
            return true ? throwSync(this.prefix + "sync-bad") : await delay(5, this.prefix + "unused");
        } finally {
            trace += "E";
        }
    }
}

const sourceTryConditionalMixedSyncThrowCatchFinally = async (prefix: string): Promise<string> => {
    try {
        return true ? throwSync(prefix + "sync-bad") : await delay(6, prefix + "unused");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "X";
    }
};

const runner = new SourceTryConditionalMixedRunner("method-");
const throwRunner = new SourceTryConditionalMixedThrowRunner("method-");

sourceTryConditionalMixedCatch(true, "fn-")
    .then((value) => {
        console.log("fn-sync", value, trace);
        return sourceTryConditionalMixedCatch(false, "fn-");
    })
    .then((value) => {
        console.log("fn-await-reject", value, trace);
        return runner.method(true);
    })
    .then((value) => {
        console.log("method-sync", value, trace);
        return runner.method(false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-await-reject", value, trace);
        return sourceTryConditionalMixedCatchFinally(true, "arrow-");
    })
    .then((value) => {
        console.log("arrow-sync", value, trace);
        return sourceTryConditionalMixedCatchFinally(false, "arrow-");
    })
    .then((value) => {
        console.log("arrow-await-reject", value, trace);
        return sourceTryConditionalMixedSyncThrow("fn-");
    })
    .then((value) => {
        console.log("fn-sync-throw", value, trace);
        return throwRunner.method().then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-sync-throw", value, trace);
        return sourceTryConditionalMixedSyncThrowCatchFinally("arrow-");
    })
    .then((value) => console.log("arrow-sync-throw", value, trace));
