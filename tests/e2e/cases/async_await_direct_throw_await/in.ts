import { setTimeout as delay } from "node:timers/promises";

async function declaration(prefix: string): Promise<string> {
    throw await delay(1, prefix + "declaration");
}

class Worker {
    prefix(value: string): string {
        return value + "method";
    }

    async run(): Promise<string> {
        throw await delay(2, this.prefix("-"));
    }
}

const value = async (prefix: string): Promise<string> => {
    throw await delay(3, prefix + "value");
};

declaration("fn-").catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value("arrow-").catch((reason) => console.log("value:", reason));
