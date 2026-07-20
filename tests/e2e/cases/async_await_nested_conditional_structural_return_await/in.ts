import { setTimeout as delay } from "node:timers/promises";

function combine(left: string, right: string): string {
    return left + ":" + right;
}

async function declaration(flag: boolean): Promise<any> {
    return await (flag
        ? [await delay(1, "declaration-left"), await delay(1, "declaration-right")]
        : { first: await delay(1, "declaration-first"), second: await delay(1, "declaration-second") });
}

class Worker {
    async run(flag: boolean): Promise<any> {
        return await (flag
            ? combine(await delay(1, "method-left"), await delay(1, "method-right"))
            : `method-${await delay(1, "method-first")}-${await delay(1, "method-second")}`);
    }
}

const value = async (flag: boolean): Promise<any> =>
    await (flag
        ? [await delay(1, "arrow-left"), await delay(1, "arrow-right")]
        : { first: await delay(1, "arrow-first"), second: await delay(1, "arrow-second") });

declaration(true).then((result) => console.log("declaration-true:", JSON.stringify(result)));
declaration(false).then((result) => console.log("declaration-false:", JSON.stringify(result)));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", JSON.stringify(result)));
value(false).then((result) => console.log("value-false:", JSON.stringify(result)));
