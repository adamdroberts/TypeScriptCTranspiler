import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function reflectSource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 9) return Promise.reject("reflect-bad");
    if (flag === 2) return delay(1, {});
    if (flag === 3) return delay(1, Object.create(null));
    if (flag === 5) return delay(1, null);
    return delay(1, { present: true });
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function hasDeclaration(flag: number): Promise<string> {
    try {
        return Reflect.has(await reflectSource(flag), "present")
            ? await truthyArm("has-true")
            : await falsyArm("has-false");
    } catch (_reason) {
        return "caught-has";
    }
}

class ReflectSelectorRunner {
    async getMethod(flag: number): Promise<string> {
        try {
            return Reflect.get(await reflectSource(flag), "present")
                ? await truthyArm("get-true")
                : await falsyArm("get-false");
        } finally {
            trace += "M";
        }
    }

    async setMethod(flag: number): Promise<string> {
        try {
            return Reflect.set(await reflectSource(flag), "marker", true)
                ? await truthyArm("set-true")
                : await falsyArm("set-false");
        } finally {
            trace += "S";
        }
    }
}

const descriptorArrow = async (flag: number): Promise<string> => {
    try {
        return Reflect.getOwnPropertyDescriptor(await reflectSource(flag), "present")
            ? await truthyArm("descriptor-true")
            : await falsyArm("descriptor-false");
    } catch (_reason) {
        return "caught-descriptor";
    } finally {
        trace += "V";
    }
};

async function integrityDeclaration(flag: number): Promise<string> {
    try {
        return Reflect.isExtensible(await reflectSource(flag))
            ? await truthyArm("extensible-true")
            : await falsyArm("extensible-false");
    } catch (_reason) {
        return "caught-integrity";
    }
}

const runner = new ReflectSelectorRunner();

hasDeclaration(1)
    .then((value) => {
        console.log("has-true", value, trace);
        trace = "";
        return hasDeclaration(2);
    })
    .then((value) => {
        console.log("has-false", value, trace);
        trace = "";
        return hasDeclaration(9);
    })
    .then((value) => {
        console.log("has-reject", value, trace);
        trace = "";
        return runner.getMethod(1);
    })
    .then((value) => {
        console.log("get-true", value, trace);
        trace = "";
        return runner.getMethod(2);
    })
    .then((value) => {
        console.log("get-false", value, trace);
        trace = "";
        return runner.getMethod(9).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("get-reject", value, trace);
        trace = "";
        return runner.setMethod(1);
    })
    .then((value) => {
        console.log("set-true", value, trace);
        trace = "";
        return runner.setMethod(5).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("set-throw", value, trace);
        trace = "";
        return descriptorArrow(1);
    })
    .then((value) => {
        console.log("descriptor-true", value, trace);
        trace = "";
        return descriptorArrow(2);
    })
    .then((value) => {
        console.log("descriptor-false", value, trace);
        trace = "";
        return descriptorArrow(9);
    })
    .then((value) => {
        console.log("descriptor-reject", value, trace);
        trace = "";
        return integrityDeclaration(5);
    })
    .then((value) => {
        console.log("integrity-throw", value, trace);
        trace = "";
        return integrityDeclaration(9);
    })
    .then((value) => {
        console.log("integrity-reject", value, trace);
    });
