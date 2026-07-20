import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, choice: boolean, prefix: string): Promise<string> {
    if (flag) {
        return await delay(1, prefix + "branch");
    }
    const label = prefix + "fall-";
    return choice
        ? await delay(2, "ready") && await delay(3, label + "and")
        : await delay(4, "") || await delay(5, label + "or");
}

class Worker {
    prefix(value: string): string { return value + "method"; }

    async run(flag: boolean, choice: boolean): Promise<string> {
        if (flag) {
            return await delay(6, this.prefix("branch-"));
        }
        const label = this.prefix("fall-");
        return choice
            ? await delay(7, "ready") && await delay(8, label + "and")
            : await delay(9, "") || await delay(10, label + "or");
    }
}

const value = async (flag: boolean, choice: boolean, prefix: string): Promise<string> => {
    if (flag) {
        return await delay(11, prefix + "branch");
    }
    const label = prefix + "fall-";
    return choice
        ? await delay(12, "ready") && await delay(13, label + "and")
        : await delay(14, "") || await delay(15, label + "or");
};

declaration(true, false, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, true, "fn-").then((result) => console.log("declaration-and:", result));
declaration(false, false, "fn-").then((result) => console.log("declaration-or:", result));
new Worker().run(true, false).then((result) => console.log("method-branch:", result));
new Worker().run(false, true).then((result) => console.log("method-and:", result));
new Worker().run(false, false).then((result) => console.log("method-or:", result));
value(true, false, "arrow-").then((result) => console.log("value-branch:", result));
value(false, true, "arrow-").then((result) => console.log("value-and:", result));
value(false, false, "arrow-").then((result) => console.log("value-or:", result));
