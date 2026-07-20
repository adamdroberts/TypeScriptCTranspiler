import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) return await delay(1, "declaration-branch");
    return await delay(2, "") && await delay(3, "declaration-two") && await delay(4, "declaration-three");
}

class Worker {
    async run(flag: boolean): Promise<unknown> {
        if (flag) return await delay(5, "method-branch");
        return await delay(6, flag ? "method-first" : "") || await delay(7, "method-two") || await delay(8, "method-three");
    }
}

const value = async (flag: boolean): Promise<unknown> => {
    if (flag) return await delay(9, "arrow-branch");
    return await Promise.resolve(null) ?? await delay(11, "arrow-two") ?? await delay(12, "arrow-three");
};

declaration(true).then((result) => console.log("declaration-branch:", result));
declaration(false).then((result) => console.log("declaration-fall:", result));
new Worker().run(true).then((result) => console.log("method-branch:", result));
new Worker().run(false).then((result) => console.log("method-fall:", result));
value(true).then((result) => console.log("value-branch:", result));
value(false).then((result) => console.log("value-fall:", result));
