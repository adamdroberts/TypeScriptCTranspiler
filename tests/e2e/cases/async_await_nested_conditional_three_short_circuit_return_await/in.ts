import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    return await (flag
        ? await delay(1, "declaration-one") && await delay(1, "declaration-two") && await delay(1, "declaration-three")
        : await delay(1, "") || await delay(1, "") || await delay(1, "declaration-fallback"));
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag
            ? await delay(1, "method-one") && await delay(1, "method-two") && await delay(1, "method-three")
            : await delay(1, "") || await delay(1, "") || await delay(1, "method-fallback"));
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag
        ? await delay(1, "arrow-one") && await delay(1, "arrow-two") && await delay(1, "arrow-three")
        : await delay(1, "") || await delay(1, "") || await delay(1, "arrow-fallback"));

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
