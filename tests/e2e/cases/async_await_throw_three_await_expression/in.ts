import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    throw (await delay(1, prefix + "a")) + (await delay(2, "-b")) + (await delay(3, "-c"));
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        throw (await delay(4, this.prefix("-a"))) + (await delay(5, "-b")) + (await delay(6, "-c"));
    }
}

const value = async (prefix: string): Promise<string> => {
    throw (await delay(7, prefix + "a")) + (await delay(8, "-b")) + (await delay(9, "-c"));
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
