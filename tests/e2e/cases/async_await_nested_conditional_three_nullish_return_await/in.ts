import { setTimeout as delay } from "node:timers/promises";

function nothing(): Promise<string | null> {
    return Promise.resolve(null);
}

async function declaration(flag: boolean): Promise<string> {
    return await (flag
        ? await nothing() ?? await nothing() ?? await delay(1, "declaration-fallback")
        : await delay(1, "declaration-value") ?? await delay(1, "declaration-unused") ?? await delay(1, "declaration-never"));
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag
            ? await nothing() ?? await nothing() ?? await delay(1, "method-fallback")
            : await delay(1, "method-value") ?? await delay(1, "method-unused") ?? await delay(1, "method-never"));
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag
        ? await nothing() ?? await nothing() ?? await delay(1, "arrow-fallback")
        : await delay(1, "arrow-value") ?? await delay(1, "arrow-unused") ?? await delay(1, "arrow-never"));

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
