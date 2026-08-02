import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function stablePropertySelectorCatch(flag: boolean, inner: boolean): Promise<string> {
    try {
        return (flag && inner) ? await delay(1, "fn-ok") : await delayedRejectAfter(2, "fn-bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class StablePropertySelectorRunner {
    enabled: boolean;

    constructor(enabled: boolean) {
        this.enabled = enabled;
    }

    async method(inner: boolean): Promise<string> {
        try {
            return (this.enabled && inner) ? await delay(3, "method-ok") : await delayedRejectAfter(4, "method-bad");
        } finally {
            trace += "M";
        }
    }
}

const stablePropertySelectorCatchFinally = async (flag: boolean, inner: boolean): Promise<string> => {
    try {
        return (flag || inner) ? await delay(5, "arrow-ok") : await delayedRejectAfter(6, "arrow-bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new StablePropertySelectorRunner(true);

stablePropertySelectorCatch(true, false)
    .then((value) => {
        console.log("fn-reject", value, trace);
        return stablePropertySelectorCatch(true, true);
    })
    .then((value) => {
        console.log("fn-ok", value, trace);
        return runner.method(false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return runner.method(true);
    })
    .then((value) => {
        console.log("method-ok", value, trace);
        return stablePropertySelectorCatchFinally(false, false);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
        return stablePropertySelectorCatchFinally(false, true);
    })
    .then((value) => console.log("arrow-ok", value, trace));
