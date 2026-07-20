import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) return await delay(1, prefix + "branch");
    return await delay(2, prefix + "one") + await delay(3, "-two") + await delay(4, "-three");
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) return await delay(5, prefix + "branch");
        return await delay(6, prefix + "one") + await delay(7, "-two") + await delay(8, "-three");
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return await delay(9, prefix + "branch");
    return await delay(10, prefix + "one") + await delay(11, "-two") + await delay(12, "-three");
};

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", result));
new Worker().run(true, "method-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "method-").then((result) => console.log("method-fall:", result));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
