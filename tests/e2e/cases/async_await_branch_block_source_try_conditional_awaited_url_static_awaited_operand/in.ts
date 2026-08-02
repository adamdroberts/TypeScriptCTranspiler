import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function inputValue(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("url-static-bad");
    return delay(1, flag === 1 ? "https://example.com/path" : "not a url");
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function declaration(flag: number): Promise<string> {
    try {
        return URL.canParse(await inputValue(flag))
            ? await truthyArm("url-true")
            : await falsyArm("url-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class UrlStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return URL.canParse(await inputValue(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return URL.canParse(await inputValue(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

const runner = new UrlStaticSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("url-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("url-invalid", valueResult, trace);
        trace = "";
        return declaration(6);
    })
    .then((valueResult) => {
        console.log("url-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("method-true", valueResult, trace);
        trace = "";
        return runner.method(3);
    })
    .then((valueResult) => {
        console.log("method-invalid", valueResult, trace);
        trace = "";
        return runner.method(6).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((valueResult) => {
        console.log("method-reject", valueResult, trace);
        trace = "";
        return arrow(1);
    })
    .then((valueResult) => {
        console.log("arrow-true", valueResult, trace);
        trace = "";
        return arrow(3);
    })
    .then((valueResult) => {
        console.log("arrow-invalid", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
    });
