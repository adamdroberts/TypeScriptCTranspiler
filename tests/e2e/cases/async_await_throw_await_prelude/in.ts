import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    const label = prefix + "declaration";
    throw await delay(1, label);
}

class Worker {
    prefix(value: string): string { return value + "method"; }
    async run(): Promise<string> {
        const label = this.prefix("-");
        throw await delay(2, label);
    }
}

const value = async (prefix: string): Promise<string> => {
    const label = prefix + "value";
    throw await delay(3, label);
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
