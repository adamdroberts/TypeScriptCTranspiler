import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, choice: boolean, prefix: string): Promise<string> {
    if (flag) {
        return await delay(1, prefix + "branch");
    }
    const label = prefix + "fall-";
    return choice
        ? await delay(2, label + "first") + await delay(3, "-second")
        : await delay(4, label + "other") + await delay(5, "-tail");
}

class Worker {
    prefix(value: string): string { return value + "method"; }

    async run(flag: boolean, choice: boolean): Promise<string> {
        if (flag) {
            return await delay(6, this.prefix("branch-"));
        }
        const label = this.prefix("fall-");
        return choice
            ? await delay(7, label + "first") + await delay(8, "-second")
            : await delay(9, label + "other") + await delay(10, "-tail");
    }
}

const value = async (flag: boolean, choice: boolean, prefix: string): Promise<string> => {
    if (flag) {
        return await delay(11, prefix + "branch");
    }
    const label = prefix + "fall-";
    return choice
        ? await delay(12, label + "first") + await delay(13, "-second")
        : await delay(14, label + "other") + await delay(15, "-tail");
};

declaration(true, false, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, true, "fn-").then((result) => console.log("declaration-first:", result));
declaration(false, false, "fn-").then((result) => console.log("declaration-other:", result));
new Worker().run(true, false).then((result) => console.log("method-branch:", result));
new Worker().run(false, true).then((result) => console.log("method-first:", result));
new Worker().run(false, false).then((result) => console.log("method-other:", result));
value(true, false, "arrow-").then((result) => console.log("value-branch:", result));
value(false, true, "arrow-").then((result) => console.log("value-first:", result));
value(false, false, "arrow-").then((result) => console.log("value-other:", result));
