import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function comparisonSelectorCatch(flag: boolean, inner: boolean): Promise<string> {
    try {
        return (flag === true && inner !== false) ? await delay(1, "fn-ok") : await delayedRejectAfter(2, "fn-bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class ComparisonSelectorRunner {
    async method(flag: boolean, inner: boolean): Promise<string> {
        try {
            return (!flag || inner === true) ? await delay(3, "method-ok") : await delayedRejectAfter(4, "method-bad");
        } finally {
            trace += "M";
        }
    }
}

const comparisonSelectorCatchFinally = async (flag: boolean, inner: boolean): Promise<string> => {
    try {
        return ((flag !== false && inner === true) || !flag)
            ? await delay(5, "arrow-ok")
            : await delayedRejectAfter(6, "arrow-bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new ComparisonSelectorRunner();

comparisonSelectorCatch(true, false)
    .then((value) => {
        console.log("fn-reject", value, trace);
        return comparisonSelectorCatch(true, true);
    })
    .then((value) => {
        console.log("fn-ok", value, trace);
        return runner.method(true, false).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return runner.method(false, true);
    })
    .then((value) => {
        console.log("method-ok", value, trace);
        return comparisonSelectorCatchFinally(true, false);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
        return comparisonSelectorCatchFinally(false, true);
    })
    .then((value) => console.log("arrow-ok", value, trace));
