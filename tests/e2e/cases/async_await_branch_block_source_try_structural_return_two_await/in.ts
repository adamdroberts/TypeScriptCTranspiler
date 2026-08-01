import { setTimeout as delay } from "node:timers/promises";

function delayedRejectAfter(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

function joinValues(first: string, second: string): string {
    return first + "|" + second;
}

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        try {
            return `declaration:${await delayedRejectAfter(1, "declaration-rejection")}:${await delay(1, "unused-two")}`;
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
                return `method:${await delay(1, "method-one")}:${await delay(1, "method-two")}`;
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
            return joinValues(await delay(1, "arrow-one"), await delay(1, "arrow-two"));
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
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
