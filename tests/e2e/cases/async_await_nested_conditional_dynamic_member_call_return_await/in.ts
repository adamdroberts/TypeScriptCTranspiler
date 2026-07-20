import { setTimeout as delay } from "node:timers/promises";

type Formatter = (left: string, right: string) => string;

function formatter(): Promise<Formatter> {
    return Promise.resolve((left: string, right: string) => left + ":" + right);
}

class Joiner {
    join(left: string, right: string): string {
        return left + ":" + right;
    }
}

function joiner(): Promise<Joiner> {
    return Promise.resolve(new Joiner());
}

async function declaration(flag: boolean): Promise<string> {
    return await (flag
        ? (await formatter())(await delay(1, "declaration-left"), await delay(1, "declaration-right"))
        : (await joiner()).join(await delay(1, "declaration-first"), await delay(1, "declaration-second")));
}

class Worker {
    async run(flag: boolean): Promise<string> {
        return await (flag
            ? (await joiner()).join(await delay(1, "method-left"), await delay(1, "method-right"))
            : (await formatter())(await delay(1, "method-first"), await delay(1, "method-second")));
    }
}

const value = async (flag: boolean): Promise<string> =>
    await (flag
        ? (await formatter())(await delay(1, "arrow-left"), await delay(1, "arrow-right"))
        : (await joiner()).join(await delay(1, "arrow-first"), await delay(1, "arrow-second")));

declaration(true).then((result) => console.log("declaration-true:", result));
declaration(false).then((result) => console.log("declaration-false:", result));
new Worker().run(true).then((result) => console.log("method-true:", result));
new Worker().run(false).then((result) => console.log("method-false:", result));
value(true).then((result) => console.log("value-true:", result));
value(false).then((result) => console.log("value-false:", result));
