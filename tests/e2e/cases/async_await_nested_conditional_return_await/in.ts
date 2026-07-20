import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    return await (flag ? await delay(1, "declaration-then") : await delay(1, "declaration-else"));
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag ? await delay(1, "method-then") : await delay(1, "method-else"));
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag ? await delay(1, "arrow-then") : await delay(1, "arrow-else"));

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
