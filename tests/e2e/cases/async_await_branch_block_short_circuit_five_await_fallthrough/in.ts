import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<unknown> {
    if (flag) return await delay(1, "declaration-branch");
    return await delay(2, "declaration-one") && await delay(3, "declaration-two") && await delay(4, "declaration-three") && await delay(5, "declaration-four") && await delay(6, "declaration-five");
}

class Worker {
    async run(flag: boolean): Promise<unknown> {
        if (flag) return await delay(7, "method-branch");
        return await delay(8, "") || await delay(9, "method-two") || await delay(10, "method-three") || await delay(11, "method-four") || await delay(12, "method-five");
    }
}

const value = async (flag: boolean): Promise<unknown> => {
    if (flag) return await delay(13, "arrow-branch");
    return await Promise.resolve(null) ?? await delay(14, "arrow-two") ?? await delay(15, "arrow-three") ?? await delay(16, "arrow-four") ?? await delay(17, "arrow-five");
};

declaration(true).then((result) => console.log("declaration-branch:", result));
declaration(false).then((result) => console.log("declaration-fall:", result));
new Worker().run(true).then((result) => console.log("method-branch:", result));
new Worker().run(false).then((result) => console.log("method-fall:", result));
value(true).then((result) => console.log("value-branch:", result));
value(false).then((result) => console.log("value-fall:", result));
