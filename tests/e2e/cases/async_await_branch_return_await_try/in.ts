import { setTimeout as delay } from "node:timers/promises";

function delayedReject(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        try {
            return await delay(1, "declaration-ok");
        } catch (reason) {
            return "declaration-caught-" + reason;
        }
    }
    try {
        return await delayedReject(2, "declaration-bad");
    } catch (reason) {
        return "declaration-caught-" + reason;
    }
}

class Worker {
    async run(flag: boolean): Promise<string> {
        if (flag) {
            try {
                return await delay(3, "method-ok");
            } catch (reason) {
                return "method-caught-" + reason;
            }
        }
        try {
            return await delayedReject(4, "method-bad");
        } catch (reason) {
            return "method-caught-" + reason;
        }
    }
}

const value = async (flag: boolean): Promise<string> => {
    if (flag) {
        try {
            return await delay(5, "value-ok");
        } catch (reason) {
            return "value-caught-" + reason;
        }
    }
    try {
        return await delayedReject(6, "value-bad");
    } catch (reason) {
        return "value-caught-" + reason;
    }
};

declaration(true).then((result) => console.log("declaration-ok:", result));
declaration(false).then((result) => console.log("declaration-catch:", result));
new Worker().run(true).then((result) => console.log("method-ok:", result));
new Worker().run(false).then((result) => console.log("method-catch:", result));
value(true).then((result) => console.log("value-ok:", result));
value(false).then((result) => console.log("value-catch:", result));
