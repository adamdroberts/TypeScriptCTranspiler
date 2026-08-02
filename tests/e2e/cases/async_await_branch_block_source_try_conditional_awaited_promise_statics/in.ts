import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function valueSource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 9) return Promise.reject("promise-bad");
    return delay(1, flag === 2 ? null : "ready");
}

function iterableSource(flag: number): Promise<any[]> {
    trace += "L";
    if (flag === 9) return Promise.reject("iterable-bad");
    if (flag === 2) return delay(1, null as any);
    return delay(1, [Promise.resolve("ready")]);
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

function falsyArm(label: string): Promise<string> {
    trace += "F";
    return delay(1, label);
}

async function resolveDeclaration(flag: number): Promise<string> {
    try {
        return (Promise.resolve(await valueSource(flag)) as any)
            ? await truthyArm("resolve-true")
            : await falsyArm("resolve-false");
    } catch (_reason) {
        return "caught-resolve";
    }
}

class PromiseSelectorRunner {
    async allMethod(flag: number): Promise<string> {
        try {
            return (Promise.all(await iterableSource(flag)) as any)
                ? await truthyArm("all-true")
                : await falsyArm("all-false");
        } finally {
            trace += "M";
        }
    }

    async raceMethod(flag: number): Promise<string> {
        try {
            return (Promise.race(await iterableSource(flag)) as any)
                ? await truthyArm("race-true")
                : await falsyArm("race-false");
        } finally {
            trace += "R";
        }
    }
}

const allSettledArrow = async (flag: number): Promise<string> => {
    try {
        return (Promise.allSettled(await iterableSource(flag)) as any)
            ? await truthyArm("all-settled-true")
            : await falsyArm("all-settled-false");
    } catch (_reason) {
        return "caught-all-settled";
    } finally {
        trace += "V";
    }
};

async function anyDeclaration(flag: number): Promise<string> {
    try {
        return (Promise.any(await iterableSource(flag)) as any)
            ? await truthyArm("any-true")
            : await falsyArm("any-false");
    } catch (_reason) {
        return "caught-any";
    }
}

const runner = new PromiseSelectorRunner();

resolveDeclaration(1)
    .then((value) => {
        console.log("resolve-true", value, trace);
        trace = "";
        return resolveDeclaration(9);
    })
    .then((value) => {
        console.log("resolve-reject", value, trace);
        trace = "";
        return runner.allMethod(1);
    })
    .then((value) => {
        console.log("all-true", value, trace);
        trace = "";
        return runner.allMethod(9).then(
            (result) => "unexpected-" + result,
            (_reason) => "rejected-all",
        );
    })
    .then((value) => {
        console.log("all-throw", value, trace);
        trace = "";
        return runner.raceMethod(1);
    })
    .then((value) => {
        console.log("race-true", value, trace);
        trace = "";
        return allSettledArrow(9);
    })
    .then((value) => {
        console.log("all-settled-throw", value, trace);
        trace = "";
        return anyDeclaration(1);
    })
    .then((value) => {
        console.log("any-true", value, trace);
        trace = "";
    });
