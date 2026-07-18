import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function declaredCatchTryPrelude(): Promise<string> {
    try {
        const head = "decl-";
        let suffix = "!";
        const value = await delayedRejectAfter(1, "decl-bad");
        return head + "try:" + value + suffix;
    } catch (e) {
        return "decl-caught:" + e;
    }
}

async function declaredFinallyTryPrelude(): Promise<string> {
    try {
        const head = "decl-final|";
        const value = await delay(2, "decl-final-ok");
        return head + value;
    } finally {
        trace += "D";
    }
}

const valueCatchTryPrelude = async (): Promise<string> => {
    try {
        const head = "value-";
        const value = await delay(3, "value-ok");
        return head + "try:" + value;
    } catch (e) {
        return "value-caught:" + e;
    }
};

const valueFinallyTryPrelude = async (): Promise<string> => {
    try {
        const head = "value-final|";
        const value = await delayedRejectAfter(4, "value-final-bad");
        return head + value;
    } finally {
        trace += "V";
    }
};

class TryPreludeWorker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async catchTryPrelude(): Promise<string> {
        try {
            const label = "method-";
            const value = await delayedRejectAfter(5, "method-bad");
            return this.prefix + label + "try:" + value;
        } catch (e) {
            return this.prefix + "method-caught:" + e;
        }
    }

    async finallyTryPrelude(): Promise<string> {
        try {
            const label = "method-final|";
            const value = await delay(6, "method-final-ok");
            return this.prefix + label + value;
        } finally {
            trace += this.prefix + "M";
        }
    }
}

const worker = new TryPreludeWorker("class-");

declaredCatchTryPrelude().then((value: string): void => {
    console.log("decl-catch-try-prelude:", value);
});

declaredFinallyTryPrelude().then((value: string): void => {
    console.log("decl-finally-try-prelude:", value, trace);
});

valueCatchTryPrelude().then((value: string): void => {
    console.log("value-catch-try-prelude:", value);
});

valueFinallyTryPrelude().catch((reason: string): void => {
    console.log("value-finally-try-prelude:", reason, trace);
});

worker.catchTryPrelude().then((value: string): void => {
    console.log("method-catch-try-prelude:", value);
});

worker.finallyTryPrelude().then((value: string): void => {
    console.log("method-finally-try-prelude:", value, trace);
});
