import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) return await delay(1, prefix + "branch");
    return await delay(2, prefix + "one") + await delay(3, "-two") + await delay(4, "-three") + await delay(5, "-four") + await delay(6, "-five");
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) return await delay(7, prefix + "branch");
        return await delay(8, prefix + "one") + await delay(9, "-two") + await delay(10, "-three") + await delay(11, "-four") + await delay(12, "-five");
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return await delay(13, prefix + "branch");
    return await delay(14, prefix + "one") + await delay(15, "-two") + await delay(16, "-three") + await delay(17, "-four") + await delay(18, "-five");
};

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", result));
new Worker().run(true, "method-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "method-").then((result) => console.log("method-fall:", result));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
