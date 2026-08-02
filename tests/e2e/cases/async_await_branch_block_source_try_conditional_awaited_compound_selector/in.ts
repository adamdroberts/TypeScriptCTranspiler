import { setTimeout as delay } from "node:timers/promises";

function select(flag: number): Promise<boolean> {
    if (flag === 2) return Promise.reject("selector-bad");
    return delay(flag === 1 ? 1 : 2, flag === 1);
}

let trace = "";

async function compoundSelectorCatch(flag: number, ready: boolean): Promise<string> {
    try {
        return ((await select(flag)) === true && ready) ? await delay(3, "fn-true") : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class CompoundSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return (!(await select(flag) === true)) ? await delay(5, "method-negated") : await delay(6, "method-true");
        } finally {
            trace += "M";
        }
    }
}

const compoundSelectorCatchFinally = async (flag: number, ready: boolean): Promise<string> => {
    try {
        return ((await select(flag)) === true || ready) ? await delay(7, "arrow-true") : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new CompoundSelectorRunner();

compoundSelectorCatch(0, true)
    .then((value) => {
        console.log("fn-false", value, trace);
        return compoundSelectorCatch(1, true);
    })
    .then((value) => {
        console.log("fn-true", value, trace);
        return compoundSelectorCatch(1, false);
    })
    .then((value) => {
        console.log("fn-short", value, trace);
        return compoundSelectorCatch(2, true);
    })
    .then((value) => {
        console.log("fn-reject", value, trace);
        return runner.method(0);
    })
    .then((value) => {
        console.log("method-negated", value, trace);
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-true", value, trace);
        return runner.method(2).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-reject", value, trace);
        return compoundSelectorCatchFinally(0, false);
    })
    .then((value) => {
        console.log("arrow-false", value, trace);
        return compoundSelectorCatchFinally(0, true);
    })
    .then((value) => {
        console.log("arrow-ready", value, trace);
        return compoundSelectorCatchFinally(1, false);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        return compoundSelectorCatchFinally(2, false);
    })
    .then((value) => console.log("arrow-reject", value, trace));
