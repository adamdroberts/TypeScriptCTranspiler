import { setTimeout as delay } from "node:timers/promises";

function combine(first: string, second: string): string {
    return `${first}-${second}`;
}

async function declaration(flag: boolean, prefix: string): Promise<unknown> {
    if (flag) return await delay(1, prefix + "branch");
    return ["fn-", await delay(2, "one"), await delay(3, "two")];
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

async function typedArray(flag: boolean): Promise<string[]> {
    if (flag) return ["typed", await delay(10, "branch-one"), await delay(11, "branch-two")];
    return ["typed", await delay(12, "fall-one"), await delay(13, "fall-two")];
}

async function callValue(flag: boolean): Promise<unknown> {
    if (flag) return await delay(14, "call-branch");
    return combine(await delay(15, "call-one"), await delay(16, "call-two"));
}

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", JSON.stringify(result)));
new Worker().run(true, "method-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "method-").then((result) => console.log("method-fall:", JSON.stringify(result)));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
typedArray(false).then((result) => console.log("typed-array:", JSON.stringify(result)));
callValue(false).then((result) => console.log("call-fall:", result));
