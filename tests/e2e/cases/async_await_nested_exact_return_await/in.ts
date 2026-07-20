import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    return await (await delay(1, "declaration"));
}

class Worker {
    async run(): Promise<string> {
        return await (await delay(1, "method"));
    }
}

const value = async (): Promise<string> =>
    await (await delay(1, "arrow"));

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
