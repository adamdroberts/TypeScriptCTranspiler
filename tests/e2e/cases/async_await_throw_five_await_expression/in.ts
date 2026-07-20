import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    throw (await delay(1, prefix + "a")) + (await delay(2, "-b")) + (await delay(3, "-c")) + (await delay(4, "-d")) + (await delay(5, "-e"));
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        throw (await delay(6, this.prefix("-a"))) + (await delay(7, "-b")) + (await delay(8, "-c")) + (await delay(9, "-d")) + (await delay(10, "-e"));
    }
}

const value = async (prefix: string): Promise<string> => {
    throw (await delay(11, prefix + "a")) + (await delay(12, "-b")) + (await delay(13, "-c")) + (await delay(14, "-d")) + (await delay(15, "-e"));
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
