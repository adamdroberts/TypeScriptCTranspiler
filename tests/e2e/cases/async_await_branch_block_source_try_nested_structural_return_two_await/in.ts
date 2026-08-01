import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) {
        try {
            return [["declaration", await delay(2, "one")], { second: await delay(3, "two") }];
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
                return { label: "method", values: [await delay(4, "method-one"), { second: await delay(5, "method-two") }] };
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
            return [{ first: await delayedRejectAfter(20, "arrow-rejection") }, ["unused", await delay(21, "unused-two")]];
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
