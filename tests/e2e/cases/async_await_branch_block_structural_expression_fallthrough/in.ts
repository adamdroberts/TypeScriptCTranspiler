import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<unknown> {
    if (flag) return await delay(1, prefix + "branch");
    return { prefix: "fn-", first: await delay(2, "one"), second: await delay(3, "two") };
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<unknown> {
        if (flag) return await delay(4, prefix + "branch");
        return { prefix: "method-", first: await delay(5, "one"), second: await delay(6, "two") };
    }
}

const value = async (flag: boolean, prefix: string): Promise<unknown> => {
    if (flag) return await delay(7, prefix + "branch");
    return `value-${await delay(8, prefix + "one")}-${await delay(9, "two")}`;
};

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", JSON.stringify(result)));
new Worker().run(true, "method-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "method-").then((result) => console.log("method-fall:", JSON.stringify(result)));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
