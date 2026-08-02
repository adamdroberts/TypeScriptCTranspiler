import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function left(route: number): Promise<boolean> {
    trace += "L";
    if (route === 6) return Promise.reject("left-bad");
    return delay(1, true);
}

function right(route: number): Promise<boolean> {
    trace += "R";
    if (route === 7) return Promise.reject("right-bad");
    return delay(1, false);
}

function fallback(route: number): Promise<string> {
    trace += "F";
    if (route === 8) return Promise.reject("fallback-bad");
    return delay(1, "fallback");
}

async function declaration(route: number): Promise<string> {
    try {
        return (route === 1 || route === 6 ? await left(route) : await right(route))
            ? await delay(2, "declaration-true")
            : await fallback(route);
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NestedSelectorRunner {
    async method(route: number): Promise<string> {
        try {
            return (route === 1 || route === 6 ? await left(route) : await right(route))
                ? await delay(2, "method-true")
                : await fallback(route);
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (route: number): Promise<string> => {
    try {
        return (route === 1 || route === 6 ? await left(route) : await right(route))
            ? await delay(2, "arrow-true")
            : await fallback(route);
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new NestedSelectorRunner();

declaration(1)
    .then((value) => {
        console.log("declaration-left-true", value, trace);
        trace = "";
        return declaration(2);
    })
    .then((value) => {
        console.log("declaration-right-false", value, trace);
        trace = "";
        return declaration(6);
    })
    .then((value) => {
        console.log("declaration-left-reject", value, trace);
        trace = "";
        return declaration(7);
    })
    .then((value) => {
        console.log("declaration-right-reject", value, trace);
        trace = "";
        return declaration(8);
    })
    .then((value) => {
        console.log("declaration-fallback-reject", value, trace);
        trace = "";
        return runner.method(1);
    })
    .then((value) => {
        console.log("method-left-true", value, trace);
        trace = "";
        return runner.method(2);
    })
    .then((value) => {
        console.log("method-right-false", value, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-left-reject", value, trace);
        trace = "";
        return runner.method(7).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-right-reject", value, trace);
        trace = "";
        return runner.method(8).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("method-fallback-reject", value, trace);
        trace = "";
        return arrow(1);
    })
    .then((value) => {
        console.log("arrow-left-true", value, trace);
        trace = "";
        return arrow(2);
    })
    .then((value) => {
        console.log("arrow-right-false", value, trace);
        trace = "";
        return arrow(6);
    })
    .then((value) => {
        console.log("arrow-left-reject", value, trace);
        trace = "";
        return arrow(7);
    })
    .then((value) => {
        console.log("arrow-right-reject", value, trace);
        trace = "";
        return arrow(8);
    })
    .then((value) => console.log("arrow-fallback-reject", value, trace));
