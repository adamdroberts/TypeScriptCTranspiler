import { setTimeout as delay } from "node:timers/promises";

async function branch(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const first = await delay(1, prefix + "first");
        throw await delay(2, first + "-throw");
    }
    const value = await delay(3, prefix + "return");
    return value;
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(flag: boolean): Promise<string> {
        if (flag) {
            const first = await delay(4, this.prefix("-"));
            throw await delay(5, first + "-throw");
        }
        return await delay(6, this.prefix("-return"));
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const first = await delay(7, prefix + "first");
        throw await delay(8, first + "-throw");
    }
    return await delay(9, prefix + "return");
};

branch(true, "fn-").catch((reason) => console.log("branch:", reason));
branch(false, "fn-").then((result) => console.log("branch-return:", result));
new Worker().run(true).catch((reason) => console.log("method:", reason));
new Worker().run(false).then((result) => console.log("method-return:", result));
value(true, "arrow-").catch((reason) => console.log("value:", reason));
value(false, "arrow-").then((result) => console.log("value-return:", result));
