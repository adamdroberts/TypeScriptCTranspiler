import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function proxySource(flag: number): Promise<any> {
    trace += "L";
    if (flag === 9) return Promise.reject("proxy-target-bad");
    if (flag === 5) return delay(1, null);
    if (flag === 2) return delay(1, {});
    return delay(1, { value: true });
}

function truthyArm(label: string): Promise<string> {
    trace += "T";
    return delay(1, label);
}

async function constructorDeclaration(flag: number): Promise<string> {
    try {
        return new Proxy(await proxySource(flag), {})
            ? await truthyArm("constructor-true")
            : await truthyArm("constructor-false");
    } catch (_reason) {
        return "caught-constructor";
    }
}

class ProxySelectorRunner {
    async revocableMethod(flag: number): Promise<string> {
        try {
            return Proxy.revocable(await proxySource(flag), {})
                ? await truthyArm("revocable-true")
                : await truthyArm("revocable-false");
        } finally {
            trace += "M";
        }
    }
}

const arrow = async (flag: number): Promise<string> => {
    try {
        return new Proxy(await proxySource(flag), {})
            ? await truthyArm("arrow-true")
            : await truthyArm("arrow-false");
    } catch (_reason) {
        return "caught-arrow";
    } finally {
        trace += "V";
    }
};

const runner = new ProxySelectorRunner();

constructorDeclaration(1)
    .then((value) => {
        console.log("constructor-true", value, trace);
        trace = "";
        return constructorDeclaration(5);
    })
    .then((value) => {
        console.log("constructor-target-error", value, trace);
        trace = "";
        return constructorDeclaration(9);
    })
    .then((value) => {
        console.log("constructor-reject", value, trace);
        trace = "";
        return runner.revocableMethod(1);
    })
    .then((value) => {
        console.log("revocable-true", value, trace);
        trace = "";
        return runner.revocableMethod(5).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("revocable-target-error", value, trace);
        trace = "";
        return runner.revocableMethod(9).then(
            (result) => "unexpected-" + result,
            (reason) => "rejected-" + reason,
        );
    })
    .then((value) => {
        console.log("revocable-reject", value, trace);
        trace = "";
        return arrow(2);
    })
    .then((value) => {
        console.log("arrow-true", value, trace);
        trace = "";
        return arrow(5);
    })
    .then((value) => {
        console.log("arrow-target-error", value, trace);
        trace = "";
        return arrow(9);
    })
    .then((value) => {
        console.log("arrow-reject", value, trace);
    });
