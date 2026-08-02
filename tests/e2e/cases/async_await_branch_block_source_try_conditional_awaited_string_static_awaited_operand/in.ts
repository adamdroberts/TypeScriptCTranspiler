import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function codeValue(flag: number): Promise<number> {
    trace += "L";
    if (flag === 6) return Promise.reject("string-static-bad");
    if (flag === 4) return delay(1, -1);
    return delay(1, flag === 1 ? 65 : 0x1f600);
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function charDeclaration(flag: number): Promise<string> {
    try {
        return String.fromCharCode(await codeValue(flag))
            ? await truthyArm("char-true")
            : await falsyArm("char-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

class StringStaticSelectorRunner {
    async method(flag: number): Promise<string> {
        try {
            return String.fromCodePoint(await codeValue(flag))
                ? await truthyArm("point-true")
                : await falsyArm("point-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return String.fromCharCode(await codeValue(flag))
            ? await truthyArm("arrow-true")
            : await falsyArm("arrow-false");
    } catch (reason) {
        return "caught-" + reason;
    } finally {
        trace += "V";
    }
};

async function pointDeclaration(flag: number): Promise<string> {
    try {
        return String.fromCodePoint(await codeValue(flag))
            ? await truthyArm("point-declaration-true")
            : await falsyArm("point-declaration-false");
    } catch (reason) {
        return "caught-" + reason;
    }
}

const runner = new StringStaticSelectorRunner();

charDeclaration(1)
    .then((valueResult) => {
        console.log("char-true", valueResult, trace);
        trace = "";
        return charDeclaration(6);
    })
    .then((valueResult) => {
        console.log("char-reject", valueResult, trace);
        trace = "";
        return runner.method(1);
    })
    .then((valueResult) => {
        console.log("point-true", valueResult, trace);
        trace = "";
        return runner.method(4).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((valueResult) => {
        console.log("point-reject", valueResult, trace);
        trace = "";
        return arrow(1);
    })
    .then((valueResult) => {
        console.log("arrow-true", valueResult, trace);
        trace = "";
        return arrow(6);
    })
    .then((valueResult) => {
        console.log("arrow-reject", valueResult, trace);
        trace = "";
        return pointDeclaration(1);
    })
    .then((valueResult) => {
        console.log("point-declaration-true", valueResult, trace);
    });
