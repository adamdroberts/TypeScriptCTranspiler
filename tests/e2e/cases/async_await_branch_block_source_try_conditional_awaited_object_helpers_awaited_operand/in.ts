import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function objectSource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 9) return Promise.reject("object-helper-bad");
    if (flag === 2) return delay(1, Object.create(null));
    if (flag === 3) return delay(1, {});
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

async function descriptorDeclaration(flag: number): Promise<string> {
    try {
        return Object.getOwnPropertyDescriptor(await objectSource(flag), "present")
            ? await truthyArm("descriptor-true")
            : await falsyArm("descriptor-false");
    } catch (_reason) {
        return "caught-descriptor";
    }
}

class ObjectHelperSelectorRunner {
    async prototypeMethod(flag: number): Promise<string> {
        try {
            return Object.getPrototypeOf(await objectSource(flag))
                ? await truthyArm("prototype-true")
                : await falsyArm("prototype-false");
        } finally {
            trace += "M";
        }
    }

    async propertyMethod(flag: number): Promise<string> {
        try {
            return Object.defineProperty(await objectSource(flag), "defined", { value: true })
                ? await truthyArm("define-true")
                : await falsyArm("define-false");
        } finally {
            trace += "D";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return Object.assign(await objectSource(flag), { marker: true })
            ? await truthyArm("assign-true")
            : await falsyArm("assign-false");
    } catch (_reason) {
        return "caught-assign";
    } finally {
        trace += "V";
    }
};

async function integrityDeclaration(flag: number): Promise<string> {
    try {
        return Object.isExtensible(await objectSource(flag))
            ? await truthyArm("extensible-true")
            : await falsyArm("extensible-false");
    } catch (_reason) {
        return "caught-integrity";
    }
}

const runner = new ObjectHelperSelectorRunner();

descriptorDeclaration(1)
    .then((value) => {
        console.log("descriptor-true", value, trace);
        trace = "";
        return descriptorDeclaration(3);
    })
    .then((value) => {
        console.log("descriptor-false", value, trace);
        trace = "";
        return descriptorDeclaration(9);
    })
    .then((value) => {
        console.log("descriptor-reject", value, trace);
        trace = "";
        return runner.prototypeMethod(2);
    })
    .then((value) => {
        console.log("prototype-false", value, trace);
        trace = "";
        return runner.prototypeMethod(3);
    })
    .then((value) => {
        console.log("prototype-true", value, trace);
        trace = "";
        return runner.propertyMethod(1);
    })
    .then((value) => {
        console.log("define-true", value, trace);
        trace = "";
        return runner.propertyMethod(9).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("define-reject", value, trace);
        trace = "";
        return arrow(1);
    })
    .then((value) => {
        console.log("assign-true", value, trace);
        trace = "";
        return arrow(5);
    })
    .then((value) => {
        console.log("assign-throw", value, trace);
        trace = "";
        return arrow(9);
    })
    .then((value) => {
        console.log("assign-reject", value, trace);
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
