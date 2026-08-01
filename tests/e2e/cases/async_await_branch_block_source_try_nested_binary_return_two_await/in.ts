import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: number): Promise<number> {
    return delay(ms, reason).then((value: number): number => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) {
        try {
            return { sum: (await delay(2, 10)) + (await delay(3, 20)) };
        } catch (reason) {
            return "caught:" + reason;
        }
    }
    return "declaration-fallthrough";
}

class Worker {
    async run(flag: boolean): Promise<unknown> {
        if (flag) {
            try {
                return ["method", (await delay(20, 30)) * (await delay(21, 2))];
            } finally {
                console.log("finally: method");
            }
        }
        return "method-fallthrough";
    }
}

const value = async (flag: boolean): Promise<unknown> => {
    if (flag) {
        try {
            return { sum: (await delayedRejectAfter(100, 7)) + (await delay(101, 8)) };
        } catch (reason) {
            return "caught:" + reason;
        } finally {
            console.log("finally: arrow");
        }
    }
    return "arrow-fallthrough";
};

declaration(true).then((result) => console.log("declaration-true:", JSON.stringify(result)));
declaration(false).then((result) => console.log("declaration-false:", JSON.stringify(result)));
new Worker().run(true).then((result) => console.log("method-true:", JSON.stringify(result)));
new Worker().run(false).then((result) => console.log("method-false:", JSON.stringify(result)));
value(true).then((result) => console.log("arrow-true:", JSON.stringify(result)));
value(false).then((result) => console.log("arrow-false:", JSON.stringify(result)));
