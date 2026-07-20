import { setTimeout as delay } from "node:timers/promises";

function combine(left: string, right: string): string {
    return left + ":" + right;
}

async function declaration(): Promise<string> {
    return await `declaration:${await delay(1, "left")}:${await delay(1, "right")}`;
}

class Worker {
    async run(): Promise<string> {
        return await combine(await delay(1, "method-left"), await delay(1, "method-right"));
    }
}

const value = async (): Promise<string> =>
    await `arrow:${await delay(1, "left")}:${await delay(1, "right")}`;

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
