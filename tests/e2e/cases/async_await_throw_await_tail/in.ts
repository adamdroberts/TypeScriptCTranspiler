import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    const first = await delay(1, prefix + "first");
    throw await delay(2, first + "-declaration");
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        const first = await delay(3, this.prefix("-"));
        throw await delay(4, first + "-tail");
    }
}

const value = async (prefix: string): Promise<string> => {
    const first = await delay(5, prefix + "first");
    throw await delay(6, first + "-value");
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
