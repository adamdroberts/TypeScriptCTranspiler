import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function declaredCatchSourcePrelude(): Promise<string> {
    const head = "decl-";
    let suffix = "";
    suffix = "!";
    try {
        const value = await delayedRejectAfter(1, "decl-bad");
        return head + "catch:" + value + suffix;
    } catch (e) {
        return head + "caught:" + e + suffix;
    }
}

async function declaredFinallySourcePrelude(): Promise<string> {
    const head = "decl-final|";
    try {
        const value = await delay(2, "decl-final-ok");
        return head + value;
    } finally {
        trace += head;
    }
}

async function declaredCatchAssignedSourcePrelude(): Promise<string> {
    let head: string;
    head = "decl-assigned-";
    try {
        const value = await delay(7, "decl-assigned-ok");
        return head + value;
    } catch (e) {
        return "decl-assigned-caught:" + e;
    }
}

async function declaredCombinedAssignedSourcePrelude(): Promise<string> {
    let head: string;
    head = "decl-combined-assigned-";
    try {
        const value = await delayedRejectAfter(10, "decl-combined-bad");
        return head + value;
    } catch (e) {
        return head + "caught:" + e;
    } finally {
        trace += "C";
    }
}

const valueCatchSourcePrelude = async (): Promise<string> => {
    const head = "value-";
    try {
        const value = await delay(3, "value-ok");
        return head + "catch:" + value;
    } catch (e) {
        return head + "caught:" + e;
    }
};

const valueFinallySourcePrelude = async (): Promise<string> => {
    const head = "value-final|";
    try {
        const value = await delayedRejectAfter(4, "value-final-bad");
        return head + value;
    } finally {
        trace += head;
    }
};

const valueFinallyAssignedSourcePrelude = async (): Promise<string> => {
    let head: string;
    head = "value-assigned-final|";
    try {
        const value = await delay(8, "value-assigned-ok");
        return head + value;
    } finally {
        trace += head;
    }
};

const valueCombinedSourcePrelude = async (): Promise<string> => {
    const head = "value-combined|";
    try {
        const value = await delay(11, "value-combined-ok");
        return head + value;
    } catch (e) {
        return head + "caught:" + e;
    } finally {
        trace += head;
    }
};

class SourcePreludeWorker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async catchSourcePrelude(): Promise<string> {
        const head = this.prefix + "method-";
        try {
            const value = await delayedRejectAfter(5, "method-bad");
            return head + "catch:" + value;
        } catch (e) {
            return head + "caught:" + e;
        }
    }

    async finallySourcePrelude(): Promise<string> {
        const head = this.prefix + "method-final|";
        try {
            const value = await delay(6, "method-final-ok");
            return head + value;
        } finally {
            trace += head;
        }
    }

    async catchAssignedSourcePrelude(): Promise<string> {
        let head: string;
        head = this.prefix + "method-assigned-";
        try {
            const value = await delay(9, "method-assigned-ok");
            return head + value;
        } catch (e) {
            return this.prefix + "method-assigned-caught:" + e;
        }
    }

    async combinedAssignedSourcePrelude(): Promise<string> {
        let head: string;
        head = this.prefix + "method-combined-assigned-";
        try {
            const value = await delayedRejectAfter(12, "method-combined-bad");
            return head + value;
        } catch (e) {
            return head + "caught:" + e;
        } finally {
            trace += this.prefix + "C";
        }
    }
}

const worker = new SourcePreludeWorker("class-");

declaredCatchSourcePrelude().then((value: string): void => {
    console.log("decl-catch-source-prelude:", value);
});

declaredFinallySourcePrelude().then((value: string): void => {
    console.log("decl-finally-source-prelude:", value, trace);
});

valueCatchSourcePrelude().then((value: string): void => {
    console.log("value-catch-source-prelude:", value);
});

valueFinallySourcePrelude().catch((reason: string): void => {
    console.log("value-finally-source-prelude:", reason, trace);
});

worker.catchSourcePrelude().then((value: string): void => {
    console.log("method-catch-source-prelude:", value);
});

worker.finallySourcePrelude().then((value: string): void => {
    console.log("method-finally-source-prelude:", value, trace);
});

declaredCatchAssignedSourcePrelude().then((value: string): void => {
    console.log("decl-catch-assigned-source-prelude:", value);
});

valueFinallyAssignedSourcePrelude().then((value: string): void => {
    console.log("value-finally-assigned-source-prelude:", value, trace);
});

worker.catchAssignedSourcePrelude().then((value: string): void => {
    console.log("method-catch-assigned-source-prelude:", value);
});

declaredCombinedAssignedSourcePrelude().then((value: string): void => {
    console.log("decl-combined-assigned-source-prelude:", value, trace);
});

valueCombinedSourcePrelude().then((value: string): void => {
    console.log("value-combined-source-prelude:", value, trace);
});

worker.combinedAssignedSourcePrelude().then((value: string): void => {
    console.log("method-combined-assigned-source-prelude:", value, trace);
});
