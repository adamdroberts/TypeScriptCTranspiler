import { setTimeout as delay } from "node:timers/promises";

type RecordValue = { [key: string]: string };

function record(label: string): Promise<RecordValue> {
    return Promise.resolve({ value: label + "-value" });
}

class Pair {
    constructor(left: string, right: string) {
        console.log("method:", left + ":" + right);
    }
}

async function declaration(): Promise<string> {
    return await (await record("declaration")).value;
}

class Worker {
    async run(): Promise<Pair> {
        return await new Pair(
            await delay(1, "method-left"),
            await delay(1, "method-right"),
        );
    }
}

const value = async (): Promise<string> =>
    await (await record("arrow"))[await delay(1, "value")];

declaration().then((result) => console.log("declaration:", result));
new Worker().run().then((result) => {
    if (result) console.log("method: constructed");
});
value().then((result) => console.log("value:", result));
