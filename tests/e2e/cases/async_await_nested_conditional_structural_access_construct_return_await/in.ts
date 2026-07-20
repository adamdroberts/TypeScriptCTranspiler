import { setTimeout as delay } from "node:timers/promises";

class Pair {
    left: string;
    right: string;

    constructor(left: string, right: string) {
        this.left = left;
        this.right = right;
    }
}

async function declaration(flag: boolean): Promise<any> {
    return await (flag
        ? [await delay(1, "declaration-first"), await delay(1, "declaration-second")][1]
        : new Pair(await delay(1, "declaration-left"), await delay(1, "declaration-right")).right);
}

class Worker {
    async run(flag: boolean): Promise<any> {
        return await (flag
            ? new Pair(await delay(1, "method-left"), await delay(1, "method-right")).right
            : [await delay(1, "method-first"), await delay(1, "method-second")][1]);
    }
}

const value = async (flag: boolean): Promise<any> =>
    await (flag
        ? [await delay(1, "arrow-first"), await delay(1, "arrow-second")][1]
        : new Pair(await delay(1, "arrow-left"), await delay(1, "arrow-right")).right);

declaration(true).then((result) => console.log("declaration-true:", JSON.stringify(result)));
declaration(false).then((result) => console.log("declaration-false:", JSON.stringify(result)));
new Worker().run(true).then((result) => console.log("method-true:", JSON.stringify(result)));
new Worker().run(false).then((result) => console.log("method-false:", JSON.stringify(result)));
value(true).then((result) => console.log("value-true:", JSON.stringify(result)));
value(false).then((result) => console.log("value-false:", JSON.stringify(result)));
