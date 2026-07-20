import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, mode: boolean): Promise<any> {
    return await (flag
        ? (mode
            ? [await delay(1, "declaration-true-true-first"), await delay(1, "declaration-true-true-second")]
            : [await delay(1, "declaration-true-false-first"), await delay(1, "declaration-true-false-second")])
        : (mode
            ? { first: await delay(1, "declaration-false-true-first"), second: await delay(1, "declaration-false-true-second") }
            : { first: await delay(1, "declaration-false-false-first"), second: await delay(1, "declaration-false-false-second") }));
}

class Worker {
    async run(flag: boolean, mode: boolean): Promise<any> {
        return await (flag
            ? (mode
                ? { first: await delay(1, "method-true-true-first"), second: await delay(1, "method-true-true-second") }
                : { first: await delay(1, "method-true-false-first"), second: await delay(1, "method-true-false-second") })
            : (mode
                ? [await delay(1, "method-false-true-first"), await delay(1, "method-false-true-second")]
                : [await delay(1, "method-false-false-first"), await delay(1, "method-false-false-second")]));
    }
}

const value = async (flag: boolean, mode: boolean): Promise<any> =>
    await (flag
        ? (mode
            ? [await delay(1, "arrow-true-true-first"), await delay(1, "arrow-true-true-second")]
            : [await delay(1, "arrow-true-false-first"), await delay(1, "arrow-true-false-second")])
        : (mode
            ? { first: await delay(1, "arrow-false-true-first"), second: await delay(1, "arrow-false-true-second") }
            : { first: await delay(1, "arrow-false-false-first"), second: await delay(1, "arrow-false-false-second") }));

declaration(true, true).then((result) => console.log("declaration-true-true:", JSON.stringify(result)));
declaration(true, false).then((result) => console.log("declaration-true-false:", JSON.stringify(result)));
declaration(false, true).then((result) => console.log("declaration-false-true:", JSON.stringify(result)));
declaration(false, false).then((result) => console.log("declaration-false-false:", JSON.stringify(result)));
new Worker().run(true, true).then((result) => console.log("method-true-true:", JSON.stringify(result)));
new Worker().run(true, false).then((result) => console.log("method-true-false:", JSON.stringify(result)));
new Worker().run(false, true).then((result) => console.log("method-false-true:", JSON.stringify(result)));
new Worker().run(false, false).then((result) => console.log("method-false-false:", JSON.stringify(result)));
value(true, true).then((result) => console.log("value-true-true:", JSON.stringify(result)));
value(true, false).then((result) => console.log("value-true-false:", JSON.stringify(result)));
value(false, true).then((result) => console.log("value-false-true:", JSON.stringify(result)));
value(false, false).then((result) => console.log("value-false-false:", JSON.stringify(result)));
