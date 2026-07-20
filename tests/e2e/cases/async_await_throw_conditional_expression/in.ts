import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    throw flag
        ? await delay(1, prefix + "true")
        : await delay(2, prefix + "false");
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(flag: boolean): Promise<string> {
        throw flag
            ? await delay(3, this.prefix("-true"))
            : await delay(4, this.prefix("-false"));
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    throw flag
        ? await delay(5, prefix + "true")
        : await delay(6, prefix + "false");
};

declaration(true, "fn-").catch((reason) => console.log("declaration-true:", reason));
declaration(false, "fn-").catch((reason) => console.log("declaration-false:", reason));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).catch((reason) => console.log("method-false:", reason));
value(true, "arrow-").catch((reason) => console.log("value-true:", reason));
value(false, "arrow-").catch((reason) => console.log("value-false:", reason));
