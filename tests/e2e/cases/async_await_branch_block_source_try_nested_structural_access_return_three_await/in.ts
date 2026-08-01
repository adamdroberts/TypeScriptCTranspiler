import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

function joinValues(first: string, second: string): string {
    return first + "|" + second;
}

class Pair {
    left: string;
    right: string;

    constructor(left: string, right: string) {
        this.left = left;
        this.right = right;
    }
}

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) {
        try {
            return {
                joined: joinValues(await delay(2, "declaration-left"), await delay(3, "declaration-right")),
                templated: `declaration-${await delay(4, "template")}`,
            };
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
                return {
                    constructed: new Pair(await delay(20, "method-left"), await delay(21, "method-right")).right,
                    length: (await delay(22, "method-value")).length,
                };
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
            return [
                ["arrow-first", await delay(40, "arrow-second")][0],
                joinValues(await delayedRejectAfter(41, "arrow-rejection"), await delay(42, "unused")),
            ];
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
