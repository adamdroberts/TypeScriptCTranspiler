import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    throw await delay(1, "") || await delay(2, "fn-two") || await delay(3, "fn-three") || await delay(4, "fn-four") || await delay(5, "fn-five");
}

class Worker {
    async run(): Promise<string> {
        throw await delay(6, "method-one") && await delay(7, "method-two") && await delay(8, "method-three") && await delay(9, "method-four") && await delay(10, "method-five");
    }
}

const value = async (): Promise<string> => {
    throw await Promise.resolve(null) ?? await delay(11, "arrow-two") ?? await delay(12, "arrow-three") ?? await delay(13, "arrow-four") ?? await delay(14, "arrow-five");
};

declaration().catch((reason) => console.log("declaration:", reason));
new Worker().run().catch((reason) => console.log("method:", reason));
value().catch((reason) => console.log("value:", reason));
