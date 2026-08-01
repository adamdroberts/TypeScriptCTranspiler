import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        try {
            return await delay(1, "") && await delayedRejectAfter(1, "declaration-rejection") && await delay(1, "unused-three");
        } catch (reason) {
            return "caught:" + reason;
        }
    }
    return "declaration-fallthrough";
}

class Worker {
    async run(flag: boolean): Promise<string> {
        if (flag) {
            try {
                return await delay(1, "method-one") || await delayedRejectAfter(1, "method-rejection") || await delay(1, "unused-three");
            } finally {
                console.log("finally: method");
            }
        }
        return "method-fallthrough";
    }
}

const value = async (flag: boolean): Promise<string> => {
    if (flag) {
        try {
            return await delayedRejectAfter(1, "arrow-rejection") ?? await delay(1, "unused-two") ?? await delay(1, "unused-three");
        } catch (reason) {
            return "caught:" + reason;
        } finally {
            console.log("finally: arrow");
        }
    }
    return "arrow-fallthrough";
};

declaration(true).then((result) => console.log("declaration-true:" + result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
