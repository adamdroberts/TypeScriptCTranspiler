import { setTimeout as delay } from "node:timers/promises";

function andFirst(flag: number): Promise<boolean> {
    if (flag === 3) return Promise.reject("and-first-bad");
    return delay(1, flag === 1 || flag === 2 || flag === 4);
}

function andSecond(flag: number): Promise<boolean> {
    if (flag === 4) return Promise.reject("and-second-bad");
    return delay(2, flag === 2);
}

function orFirst(flag: number): Promise<boolean> {
    if (flag === 3) return Promise.reject("or-first-bad");
    return delay(3, flag === 0 || flag === 2);
}

function orSecond(flag: number): Promise<boolean> {
    if (flag === 4) return Promise.reject("or-second-bad");
    return delay(4, flag === 1 || flag === 2);
}

function mixFirst(flag: number): Promise<boolean> {
    if (flag === 3) return Promise.reject("mix-first-bad");
    return delay(5, flag === 1 || flag === 2 || flag === 4);
}

function mixSecond(flag: number): Promise<boolean> {
    if (flag === 4) return Promise.reject("mix-second-bad");
    return delay(6, flag === 2);
}

function mixThird(flag: number): Promise<boolean> {
    if (flag === 5) return Promise.reject("mix-third-bad");
    return delay(7, flag === 0 || flag === 2);
}

let trace = "";

async function awaitedLogicalCatch(flag: number): Promise<string> {
    try {
        return (await andFirst(flag) && await andSecond(flag)) ? await delay(8, "fn-true") : await delay(9, "fn-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class AwaitedLogicalRunner {
    async method(flag: number): Promise<string> {
        try {
            return (await orFirst(flag) || await orSecond(flag)) ? await delay(10, "method-true") : await delay(11, "method-false");
        } finally {
            trace += "M";
        }
    }
}

const awaitedLogicalCatchFinally = async (flag: number): Promise<string> => {
    try {
        return ((await mixFirst(flag) && await mixSecond(flag)) || await mixThird(flag))
            ? await delay(12, "arrow-true")
            : await delay(13, "arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new AwaitedLogicalRunner();

awaitedLogicalCatch(0)
    .then((value) => {
        console.log("fn-false-short", value, trace || "-");
        return awaitedLogicalCatch(1);
    })
    .then((value) => {
        console.log("fn-false-second", value, trace || "-");
        return awaitedLogicalCatch(2);
    })
    .then((value) => {
        console.log("fn-true", value, trace || "-");
        return awaitedLogicalCatch(3);
    })
    .then((value) => {
        console.log("fn-first-reject", value, trace || "-");
        return awaitedLogicalCatch(4);
    })
    .then((value) => {
        console.log("fn-second-reject", value, trace || "-");
        return runner.method(0);
    })
    .then((value) => {
        console.log("method-true-short", value, trace);
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-true-second", value, trace);
        return runner.method(5);
    })
    .then((value) => {
        console.log("method-false", value, trace);
        return runner.method(3).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-first-reject", value, trace);
        return runner.method(4).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-second-reject", value, trace);
        return awaitedLogicalCatchFinally(0);
    })
    .then((value) => {
        console.log("arrow-third-true", value, trace);
        return awaitedLogicalCatchFinally(1);
    })
    .then((value) => {
        console.log("arrow-third-false", value, trace);
        return awaitedLogicalCatchFinally(2);
    })
    .then((value) => {
        console.log("arrow-short-third", value, trace);
        return awaitedLogicalCatchFinally(3);
    })
    .then((value) => {
        console.log("arrow-first-reject", value, trace);
        return awaitedLogicalCatchFinally(4);
    })
    .then((value) => {
        console.log("arrow-second-reject", value, trace);
        return awaitedLogicalCatchFinally(5);
    })
    .then((value) => console.log("arrow-third-reject", value, trace));
