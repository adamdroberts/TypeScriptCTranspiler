import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        await delay(1, prefix + "branch");
    } else {
        await delay(2, prefix + "else");
    }
    throw await delay(3, prefix + "tail");
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(flag: boolean): Promise<string> {
        if (flag) {
            await delay(4, this.prefix("-branch"));
        } else {
            await delay(5, this.prefix("-else"));
        }
        throw await delay(6, this.prefix("-tail"));
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        await delay(7, prefix + "branch");
    } else {
        await delay(8, prefix + "else");
    }
    throw await delay(9, prefix + "tail");
};

declaration(true, "fn-").catch((reason) => console.log("declaration-true:", reason));
declaration(false, "fn-").catch((reason) => console.log("declaration-false:", reason));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).catch((reason) => console.log("method-false:", reason));
value(true, "arrow-").catch((reason) => console.log("value-true:", reason));
value(false, "arrow-").catch((reason) => console.log("value-false:", reason));
