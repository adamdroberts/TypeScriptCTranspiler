import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        try {
            return (await delay(1, "one") + await delay(1, "two") + await delay(1, "three") + await delay(1, "four") + await delay(1, "five"));
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
                return (await delayedRejectAfter(1, "method-rejection") + await delay(1, "unused-two") + await delay(1, "unused-three") + await delay(1, "unused-four") + await delay(1, "unused-five"));
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
            return (await delay(1, "arrow-one") + await delay(1, "arrow-two") + await delay(1, "arrow-three") + await delay(1, "arrow-four") + await delay(1, "arrow-five"));
        } catch (reason) {
            return "caught:" + reason;
        } finally {
            console.log("finally: arrow");
        }
    }
    return "arrow-fallthrough";
};

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
