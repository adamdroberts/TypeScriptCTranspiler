import { setTimeout as delay } from "node:timers/promises";

function select(flag: number): Promise<boolean> {
    if (flag === 2) return Promise.reject("selector-bad");
    return delay(flag === 1 ? 1 : 2, flag === 1);
}

let trace = "";

async function awaitedSelectorCatch(flag: number): Promise<string> {
    try {
        return (await select(flag)) ? await delay(3, "fn-true") : await delay(4, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class AwaitedSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return (await select(flag)) ? await delay(5, "method-true") : await delay(6, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const awaitedSelectorCatchFinally = async (flag: number): Promise<string> => {
    try {
        return (await select(flag)) ? await delay(7, "arrow-true") : await delay(8, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new AwaitedSelectorRunner();

awaitedSelectorCatch(0)
    .then((value) => {
        console.log("fn-false", value, trace);
        return awaitedSelectorCatch(1);
    })
    .then((value) => {
        console.log("fn-true", value, trace);
        return awaitedSelectorCatch(2);
    })
    .then((value) => {
        console.log("fn-reject", value, trace);
        return runner.method(0);
    })
    .then((value) => {
        console.log("method-false", value, trace);
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
        return awaitedSelectorCatchFinally(0);
    })
    .then((value) => {
        console.log("arrow-false", value, trace);
        return awaitedSelectorCatchFinally(1);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        return awaitedSelectorCatchFinally(2);
    })
    .then((value) => console.log("arrow-reject", value, trace));
