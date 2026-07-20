import { setTimeout as delay } from "node:timers/promises";

function format(strings: TemplateStringsArray, first: string, second: string): string {
    return strings[0] + first + strings[1] + second + strings[2];
}

async function declaration(): Promise<string> {
    return await format`declaration-${await delay(1, "left")}-${await delay(1, "right")}`;
}

class Worker {
    async run(): Promise<string> {
        return await format`method-${await delay(1, "left")}-${await delay(1, "right")}`;
    }
}

const value = async (): Promise<string> =>
    await format`arrow-${await delay(1, "left")}-${await delay(1, "right")}`;

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => console.log("method:", result));
value().then((result) => console.log("value:", result));
