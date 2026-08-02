import { setTimeout as delay } from "node:timers/promises";

function select(flag: boolean): boolean {
    if (flag) throw "selector-bad";
    return false;
}

let trace = "";

async function throwingSelectorCatch(flag: boolean): Promise<string> {
    try {
        return select(flag) ? await delay(1, "fn-true") : await delay(2, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class ThrowingSelectorRunner {
    async method(flag: boolean): Promise<string> {
        try {
            return select(flag) ? await delay(3, "method-true") : await delay(4, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const throwingSelectorCatchFinally = async (flag: boolean): Promise<string> => {
    try {
        return select(flag) ? await delay(5, "arrow-true") : await delay(6, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new ThrowingSelectorRunner();

throwingSelectorCatch(true)
    .then((value) => {
        console.log("fn-throw", value, trace);
        return throwingSelectorCatch(false);
    })
    .then((value) => {
        console.log("fn-false", value, trace);
        return runner.method(true).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-throw", value, trace);
        return runner.method(false);
    })
    .then((value) => {
        console.log("method-false", value, trace);
        return throwingSelectorCatchFinally(true);
    })
    .then((value) => {
        console.log("arrow-throw", value, trace);
        return throwingSelectorCatchFinally(false);
    })
    .then((value) => console.log("arrow-false", value, trace));
