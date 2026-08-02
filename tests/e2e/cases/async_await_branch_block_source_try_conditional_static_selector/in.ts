import { setTimeout as delay } from "node:timers/promises";

enum Mode {
    Off,
    On,
}

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function staticSelectorCatch(mode: Mode): Promise<string> {
    try {
        return (mode === Mode.On && typeof mode === "number")
            ? await delay(1, "fn-ok")
            : await delayedRejectAfter(2, "fn-bad");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class StaticSelectorRunner {
    async method(mode: Mode, inner: boolean): Promise<string> {
        try {
            return (mode === Mode.On && typeof inner === "boolean")
                ? await delay(3, "method-ok")
                : await delayedRejectAfter(4, "method-bad");
        } finally {
            trace += "M";
        }
    }
}

const staticSelectorCatchFinally = async (flag: boolean): Promise<string> => {
    try {
        return ((1n === 1n) && !flag)
            ? await delay(5, "arrow-ok")
            : await delayedRejectAfter(6, "arrow-bad");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new StaticSelectorRunner();

staticSelectorCatch(Mode.On)
    .then((value) => {
        console.log("fn-ok", value, trace);
        return runner.method(Mode.Off, true).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return staticSelectorCatchFinally(true);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
        return staticSelectorCatchFinally(false);
    })
    .then((value) => console.log("arrow-ok", value, trace));
