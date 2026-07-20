import { setTimeout as delay } from "node:timers/promises";

class Pair {
    left: string;
    right: string;

    constructor(left: string, right: string) {
        this.left = left;
        this.right = right;
    }
}

function pairConstructor(): Promise<any> {
    return Promise.resolve(Pair);
}

async function declaration(flag: boolean): Promise<any> {
    return await (flag
        ? new (await pairConstructor())(await delay(1, "declaration-dynamic-left"), await delay(1, "declaration-dynamic-right"))
        : new Pair(await delay(1, "declaration-static-left"), await delay(1, "declaration-static-right")));
}

class Worker {
    async run(flag: boolean): Promise<any> {
        return await (flag
            ? new Pair(await delay(1, "method-static-left"), await delay(1, "method-static-right"))
            : new (await pairConstructor())(await delay(1, "method-dynamic-left"), await delay(1, "method-dynamic-right")));
    }
}

const value = async (flag: boolean): Promise<any> =>
    await (flag
        ? new (await pairConstructor())(await delay(1, "arrow-dynamic-left"), await delay(1, "arrow-dynamic-right"))
        : new Pair(await delay(1, "arrow-static-left"), await delay(1, "arrow-static-right")));

declaration(true).then((result) => console.log("declaration-true:", JSON.stringify(result)));
declaration(false).then((result) => console.log("declaration-false:", JSON.stringify(result)));
new Worker().run(true).then((result) => console.log("method-true:", JSON.stringify(result)));
new Worker().run(false).then((result) => console.log("method-false:", JSON.stringify(result)));
value(true).then((result) => console.log("value-true:", JSON.stringify(result)));
value(false).then((result) => console.log("value-false:", JSON.stringify(result)));
