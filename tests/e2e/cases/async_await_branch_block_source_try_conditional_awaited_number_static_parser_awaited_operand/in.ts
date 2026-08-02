import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function value(flag: number): Promise<string> {
    trace += "L";
    if (flag === 6) return Promise.reject("number-static-parser-bad");
    return delay(1, flag === 1 ? "7.5" : "");
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
        return Number.parseInt(await value(flag))
            ? await truthyArm("declaration-true")
            : await falsyArm("declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class NumberStaticParserSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return Number.parseFloat(await value(flag))
                ? await truthyArm("method-true")
                : await falsyArm("method-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Number.parseFloat(await value(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function parseFloatDeclaration(flag: number): Promise<string> {
    try {
        return Number.parseFloat(await value(flag))
            ? await truthyArm("parse-float-true")
            : await falsyArm("parse-float-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new NumberStaticParserSelectorRunner();

declaration(1)
    .then((valueResult) => {
        console.log("declaration-true", valueResult, trace);
        trace = "";
        return declaration(3);
    })
    .then((valueResult) => {
        console.log("declaration-empty-number", valueResult, trace);
        trace = "";
        return declaration(6);
    })
    .then((valueResult) => {
        console.log("declaration-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("method-true", valueResult, trace);
        trace = "";
        return runner.method(3);
    })
    .then((valueResult) => {
        console.log("method-empty-number", valueResult, trace);
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
        console.log("arrow-empty-number", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return parseFloatDeclaration(1);
    })
    .then((valueResult) => {
        console.log("parse-float-true", valueResult, trace);
        trace = "";
        return parseFloatDeclaration(3);
    })
    .then((valueResult) => {
        console.log("parse-float-empty", valueResult, trace);
        trace = "";
        return parseFloatDeclaration(6);
    })
    .then((valueResult) => {
        console.log("parse-float-reject", valueResult, trace);
    });
