import { setTimeout as delay } from "node:timers/promises";

function tagged(strings: TemplateStringsArray, value: string): string {
    return strings[0] + value + strings[1];
}

function delayedRejectAfter(ms: number, reason: number): Promise<number> {
    return delay(ms, reason).then((value: number): number => {
        throw value;
    });
}

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) {
        try {
            return {
                kind: typeof (await delay(2, "declaration")),
                negated: -(await delay(3, 7)),
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
                return [
                    tagged`method-${await delay(20, "tagged")}`,
                    typeof (await delay(21, "method")),
                ];
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
            return {
                inverted: ~(await delayedRejectAfter(100, 7)),
                tagged: tagged`unused-${await delay(101, "value")}`,
            };
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
