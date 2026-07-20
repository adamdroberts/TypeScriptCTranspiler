import { setTimeout as delay } from "node:timers/promises";

type RecordValue = { [key: string]: string };

function record(label: string): Promise<RecordValue> {
    return Promise.resolve({ value: label + "-value" });
}

async function declaration(flag: boolean): Promise<string> {
    return await (flag
        ? (await record("declaration-receiver")).value
        : ["declaration-zero", "declaration-index"][await delay(1, 1)]);
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag
            ? ["method-zero", "method-index"][await delay(1, 1)]
            : (await record("method-receiver")).value);
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag
        ? (await record("arrow-receiver")).value
        : ["arrow-zero", "arrow-index"][await delay(1, 1)]);

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
