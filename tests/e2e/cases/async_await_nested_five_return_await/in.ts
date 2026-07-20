import { setTimeout as delay } from "node:timers/promises";

async function declaration(): Promise<string> {
    return await (await delay(1, "one") + await delay(1, "two") + await delay(1, "three") + await delay(1, "four") + await delay(1, "five"));
}

class Worker {
    async run(): Promise<string> {
        return await (await delay(1, "method-one") + await delay(1, "method-two") + await delay(1, "method-three") + await delay(1, "method-four") + await delay(1, "method-five"));
    }
}

const value = async (): Promise<string> =>
    await (await delay(1, "arrow-one") + await delay(1, "arrow-two") + await delay(1, "arrow-three") + await delay(1, "arrow-four") + await delay(1, "arrow-five"));

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
