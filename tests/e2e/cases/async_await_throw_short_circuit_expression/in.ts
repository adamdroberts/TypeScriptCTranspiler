import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    throw flag && await delay(1, prefix + "and");
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(flag: boolean): Promise<string> {
        throw flag || await delay(2, this.prefix("-or"));
    }
}

const value = async (flag: string, prefix: string): Promise<string> => {
    throw flag ?? await delay(3, prefix + "nullish");
};

declaration(true, "fn-").catch((reason) => console.log("declaration-true:", reason));
declaration(false, "fn-").catch((reason) => console.log("declaration-false:", reason));
new Worker().run(true).catch((reason) => console.log("method-true:", reason));
new Worker().run(false).catch((reason) => console.log("method-false:", reason));
value("arrow-value", "arrow-").catch((reason) => console.log("value-string:", reason));
value(null as unknown as string, "arrow-").catch((reason) => console.log("value-null:", reason));
