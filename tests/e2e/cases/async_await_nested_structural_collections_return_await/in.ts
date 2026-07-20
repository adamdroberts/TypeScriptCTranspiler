import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string[]> {
    return await [await delay(1, "left"), await delay(1, "right")];
}

class Worker {
    async run(): Promise<{ first: string; second: string }> {
        return await {
            first: await delay(1, "method-left"),
            second: await delay(1, "method-right"),
        };
    }
}

const value = async (): Promise<string[]> =>
    await [
        await delay(1, "arrow-left"),
        await delay(1, "arrow-right"),
    ];

declaration().then((result) => console.log("declaration:", JSON.stringify(result)));
new Worker().run().then((result) => console.log("method:", JSON.stringify(result)));
value().then((result) => console.log("value:", JSON.stringify(result)));
