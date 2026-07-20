import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    throw (await delay(1, prefix + "a")) + (await delay(2, "-b")) + (await delay(3, "-c")) + (await delay(4, "-d"));
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        throw (await delay(5, this.prefix("-a"))) + (await delay(6, "-b")) + (await delay(7, "-c")) + (await delay(8, "-d"));
    }
}

const value = async (prefix: string): Promise<string> => {
    throw (await delay(9, prefix + "a")) + (await delay(10, "-b")) + (await delay(11, "-c")) + (await delay(12, "-d"));
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
