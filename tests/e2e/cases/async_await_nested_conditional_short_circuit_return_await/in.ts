import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    return await (flag
        ? await delay(1, "declaration-left") && await delay(1, "declaration-right")
        : await delay(1, "") || await delay(1, "declaration-fallback"));
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag
            ? await delay(1, "method-left") && await delay(1, "method-right")
            : await delay(1, "") || await delay(1, "method-fallback"));
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag
        ? await delay(1, "arrow-left") && await delay(1, "arrow-right")
        : await delay(1, "") || await delay(1, "arrow-fallback"));

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
